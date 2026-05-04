import { Injectable, NotFoundException } from '@nestjs/common';
import { FieldValue } from 'firebase-admin/firestore';
import { FirebaseService } from '../../firebase/firebase.service';

type TimestampLike =
  | FirebaseFirestore.Timestamp
  | Date
  | { toDate?: () => Date; toMillis?: () => number }
  | string
  | number
  | null
  | undefined;

export type ScoreRating = 'Excellent' | 'Good' | 'Fair' | 'Poor' | 'Very Poor';

export interface ScoreBreakdownItem {
  subScore: number;
  weight: number;
  label: string;
}

export interface CreditScoreSummary {
  score: number;
  rating: ScoreRating;
  kycVerified: boolean;
  profileComplete: boolean;
  canApplyForLoan: boolean;
  breakdown: Record<string, ScoreBreakdownItem>;
  calculatedAt: TimestampLike;
}

/**
 * Calculates, stores, and retrieves the Smart Credit Score for each borrower
 * using a weighted breakdown of repayment history, profile completeness, and conduct.
 */
@Injectable()
export class CreditScoreService {
  private readonly BORROWERS_COL = 'borrowers';
  private readonly LOANS_COL = 'loans';
  private readonly REPAYMENTS_COL = 'repayments';
  private readonly SCORE_HISTORY_COL = 'credit_score_history';
  private readonly COMPLAINTS_COL = 'complaints';

  constructor(private readonly firebaseService: FirebaseService) {}

  private get db() {
    return this.firebaseService.db;
  }

  /** Maps a numeric score (300–850) to a human-readable rating label. */
  getScoreRating(score: number): ScoreRating {
    if (score >= 750) return 'Excellent';
    if (score >= 700) return 'Good';
    if (score >= 650) return 'Fair';
    if (score >= 500) return 'Poor';
    return 'Very Poor';
  }

  /**
   * Returns the stored credit score summary for a borrower.
   * Triggers a fresh calculation if the score hasn't been computed yet.
   */
  async getSummary(borrowerId: string): Promise<CreditScoreSummary> {
    const profileRef = this.db.collection(this.BORROWERS_COL).doc(borrowerId);
    let profileDoc = await profileRef.get();

    if (!profileDoc.exists) {
      throw new NotFoundException(
        `Borrower profile not found for user ${borrowerId}`,
      );
    }

    let profile = profileDoc.data() ?? {};

    if (!profile.scoreLastCalculated) {
      await this.calculateCreditScore(borrowerId);
      profileDoc = await profileRef.get();
      profile = profileDoc.data() ?? {};
    }

    const score = this.clampScore(this.toNumber(profile.creditScore, 300));

    return {
      score,
      rating: this.getScoreRating(score),
      kycVerified: profile.kycVerified === true,
      profileComplete: profile.profileComplete === true,
      canApplyForLoan: profile.kycVerified === true,
      breakdown: this.normalizeBreakdown(profile.scoreBreakdown),
      calculatedAt: profile.scoreLastCalculated ?? null,
    };
  }

  /**
   * Recalculates the borrower's credit score using a weighted formula
   * and persists both the profile score and a monthly history snapshot.
   */
  async calculateCreditScore(borrowerId: string): Promise<number> {
    const profileRef = this.db.collection(this.BORROWERS_COL).doc(borrowerId);
    const profileDoc = await profileRef.get();

    if (!profileDoc.exists) {
      throw new NotFoundException(
        `Borrower profile not found for user ${borrowerId}`,
      );
    }

    const profile = profileDoc.data() ?? {};
    const [repaySnap, loanSnap, complaintSnap] = await Promise.all([
      this.db
        .collection(this.REPAYMENTS_COL)
        .where('borrowerId', '==', borrowerId)
        .get(),
      this.db
        .collection(this.LOANS_COL)
        .where('borrowerId', '==', borrowerId)
        .get(),
      this.db
        .collection(this.COMPLAINTS_COL)
        .where('againstBorrowerId', '==', borrowerId)
        .get()
        .catch(() => ({ size: 0 })),
    ]);

    const repayments = repaySnap.docs.map((doc) => doc.data());
    const loans = loanSnap.docs.map((doc) => doc.data());

    const totalRepayments = repayments.length;
    const onTimePayments = repayments.filter((repayment) => {
      const paidAt = this.toDate(repayment.paidAt);
      const dueDate = this.toDate(repayment.dueDate);

      return paidAt !== null && dueDate !== null && paidAt <= dueDate;
    }).length;
    const onTimeRate =
      totalRepayments > 0 ? (onTimePayments / totalRepayments) * 100 : 50;

    const paidMonths = new Set(
      repayments
        .map((repayment) => this.toDate(repayment.paidAt))
        .filter((date): date is Date => date !== null)
        .map((date) => `${date.getFullYear()}-${date.getMonth()}`),
    ).size;
    const firstLoanDate = loans
      .map(
        (loan) =>
          this.toDate(loan.disbursedAt) ??
          this.toDate(loan.startDate) ??
          this.toDate(loan.createdAt),
      )
      .filter((date): date is Date => date !== null)
      .sort((a, b) => a.getTime() - b.getTime())[0];
    const monthsSinceFirstLoan = firstLoanDate
      ? Math.max(
          1,
          Math.round(
            (Date.now() - firstLoanDate.getTime()) / (30 * 24 * 60 * 60 * 1000),
          ),
        )
      : 1;
    const consistency = Math.min(
      100,
      (paidMonths / monthsSinceFirstLoan) * 100,
    );

    const overdueDays = repayments
      .map((repayment) => {
        const paidAt = this.toDate(repayment.paidAt);
        const dueDate = this.toDate(repayment.dueDate);

        if (!paidAt || !dueDate) {
          return null;
        }

        return Math.max(
          0,
          (paidAt.getTime() - dueDate.getTime()) / (24 * 60 * 60 * 1000),
        );
      })
      .filter((days): days is number => days !== null);
    const averageOverdueDays =
      overdueDays.length > 0
        ? overdueDays.reduce((sum, days) => sum + days, 0) / overdueDays.length
        : 0;
    const overdueAvgDays = Math.max(0, 100 - (averageOverdueDays / 60) * 100);

    const loansCompleted = Math.min(
      100,
      loans.filter(
        (loan) => String(loan.status ?? '').toLowerCase() === 'completed',
      ).length * 10,
    );
    const totalRepaid = Math.min(
      100,
      (this.toNumber(profile.totalRepaid) / 5_000_000) * 100,
    );
    const complaintScore = Math.max(0, 100 - complaintSnap.size * 20);
    const profileComplete = this.calculateProfileCompleteness(profile);

    const weighted =
      onTimeRate * 0.3 +
      consistency * 0.15 +
      overdueAvgDays * 0.1 +
      loansCompleted * 0.2 +
      totalRepaid * 0.05 +
      complaintScore * 0.15 +
      profileComplete * 0.05;
    const score = this.clampScore(Math.round(300 + (weighted / 100) * 550));
    const breakdown = {
      onTimeRate: {
        subScore: Math.round(onTimeRate),
        weight: 0.3,
        label: 'On-time payments',
      },
      consistency: {
        subScore: Math.round(consistency),
        weight: 0.15,
        label: 'Payment consistency',
      },
      overdueAvgDays: {
        subScore: Math.round(overdueAvgDays),
        weight: 0.1,
        label: 'Overdue penalty',
      },
      loansCompleted: {
        subScore: Math.round(loansCompleted),
        weight: 0.2,
        label: 'Loans completed',
      },
      totalRepaid: {
        subScore: Math.round(totalRepaid),
        weight: 0.05,
        label: 'Total repaid',
      },
      complaintScore: {
        subScore: Math.round(complaintScore),
        weight: 0.15,
        label: 'Conduct score',
      },
      profileComplete: {
        subScore: Math.round(profileComplete),
        weight: 0.05,
        label: 'Profile completeness',
      },
    };
    const month = new Date().toISOString().slice(0, 7);
    const batch = this.db.batch();

    batch.update(profileRef, {
      creditScore: score,
      scoreBreakdown: breakdown,
      scoreLastCalculated: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });
    batch.set(
      this.db.collection(this.SCORE_HISTORY_COL).doc(`${borrowerId}_${month}`),
      {
        borrowerId,
        score,
        month,
        breakdown,
        calculatedAt: FieldValue.serverTimestamp(),
      },
      { merge: true },
    );

    await batch.commit();

    return score;
  }

  /**
   * Returns up to 12 months of score history for chart rendering.
   * If no history exists yet, synthesises a single entry from the current profile score.
   */
  async getScoreHistory(
    borrowerId: string,
  ): Promise<Array<{ month: string; score: number; note: string }>> {
    const snapshot = await this.db
      .collection(this.SCORE_HISTORY_COL)
      .where('borrowerId', '==', borrowerId)
      .orderBy('calculatedAt', 'asc')
      .limitToLast(12)
      .get();

    if (snapshot.empty) {
      const profileDoc = await this.db
        .collection(this.BORROWERS_COL)
        .doc(borrowerId)
        .get();
      const currentScore = this.clampScore(
        this.toNumber(profileDoc.data()?.creditScore, 300),
      );

      return [
        {
          month: new Date().toISOString().slice(0, 7),
          score: currentScore,
          note: `Credit score recorded at ${currentScore}`,
        },
      ];
    }

    return snapshot.docs.map((doc) => {
      const data = doc.data();
      const score = this.clampScore(this.toNumber(data.score, 300));

      return {
        month: String(data.month ?? ''),
        score,
        note: `Credit score recorded at ${score}`,
      };
    });
  }

  /**
   * Calculates what percentage of the borrower's required profile fields are filled in.
   * Used as one factor in the overall credit score calculation.
   */
  private calculateProfileCompleteness(
    profile: FirebaseFirestore.DocumentData,
  ) {
    const requiredFields = [
      'fullName',
      'phone',
      'dateOfBirth',
      'nic',
      'address',
      'employmentStatus',
      'monthlyIncome',
    ];
    const filled = requiredFields.filter((field) => {
      const value = profile[field];

      if (value === undefined || value === null || value === '') {
        return false;
      }

      return !(typeof value === 'object' && Object.keys(value).length === 0);
    }).length;

    return (filled / requiredFields.length) * 100;
  }

  /** Safely casts a raw breakdown value to the typed breakdown record, returning empty if invalid. */
  private normalizeBreakdown(
    value: unknown,
  ): Record<string, ScoreBreakdownItem> {
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
      return {};
    }

    return value as Record<string, ScoreBreakdownItem>;
  }

  /** Converts any timestamp-like value to a plain Date, returning null if it can't be resolved. */
  private toDate(value: TimestampLike): Date | null {
    if (!value) {
      return null;
    }

    if (value instanceof Date) {
      return value;
    }

    if (typeof value === 'string' || typeof value === 'number') {
      const date = new Date(value);
      return Number.isNaN(date.getTime()) ? null : date;
    }

    if (typeof value.toDate === 'function') {
      const date = value.toDate();
      return Number.isNaN(date.getTime()) ? null : date;
    }

    return null;
  }

  /** Safely casts a value to a finite number, returning a fallback when it isn't. */
  private toNumber(value: unknown, fallback = 0): number {
    return typeof value === 'number' && Number.isFinite(value)
      ? value
      : fallback;
  }

  /** Clamps a score to the valid 300–850 range. */
  private clampScore(score: number): number {
    return Math.max(300, Math.min(850, Math.round(score)));
  }
}
