import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
} from '@nestjs/common';
import { Timestamp } from 'firebase-admin/firestore';
import { FirebaseService } from '../../../firebase/firebase.service';
import { Loan, LoanStatus } from '../types/borrower.types';
import { LoanApplicationStatus } from '../applications/dto/loan-application.dto';
import { BORROWER_MONEY } from '../shared/borrower.constants';

type TimestampLike =
  | FirebaseFirestore.Timestamp
  | Date
  | { toMillis?: () => number; toDate?: () => Date }
  | null
  | undefined;

/**
 * Builds the borrower home dashboard by aggregating loan, application,
 * and profile data into a single response.
 */
@Injectable()
export class BorrowerDashboardService {
  private readonly BORROWERS_COL = 'users';
  private readonly LOANS_COL = 'loans';
  private readonly LOAN_APPS_COL = 'loanApplications';
  private readonly USERS_COL = 'users';

  constructor(private readonly firebaseService: FirebaseService) {}

  private get db() {
    return this.firebaseService.db;
  }

  /**
   * Returns all dashboard metrics for the given borrower —
   * falls back to the users collection if no borrower profile exists yet.
   */
  async getDashboard(borrowerId: string) {
    if (!borrowerId) {
      throw new BadRequestException('Borrower ID is required');
    }

    try {
      const profileDoc = await this.db
        .collection(this.BORROWERS_COL)
        .doc(borrowerId)
        .get();
      let profileData = profileDoc.exists ? profileDoc.data() : null;

      if (!profileData) {
        const userDoc = await this.db
          .collection(this.USERS_COL)
          .doc(borrowerId)
          .get();
        profileData = userDoc.exists ? userDoc.data() : {};
      }

      const loansSnapshot = await this.db
        .collection(this.LOANS_COL)
        .where('borrowerId', '==', borrowerId)
        .get();

      let activeLoansCount = 0;
      let totalOutstanding = 0;
      let totalBorrowed = 0;
      let totalRepaid = 0;
      let nextPaymentAmount = 0;
      let nextDueDate: TimestampLike = null;

      loansSnapshot.forEach((doc) => {
        const data = doc.data();
        const loan = this.normalizeLoanDocument(data, doc.id);

        // A pending disbursement has been approved, but the borrower has not
        // received the funds yet. Cancelled/unknown records are likewise not
        // part of the borrower's financial totals.
        if (!this.isFundedLoanStatus(loan.status)) {
          return;
        }

        totalBorrowed += loan.principalAmount || 0;

        const totalRepayable =
          (loan.principalAmount || 0) + (loan.totalInterest || 0);
        const repaidOnThisLoan = this.readMajorUnitAmount(
          data.amountPaidMinor,
          data.amountPaid,
          Math.max(0, totalRepayable - (loan.outstandingBalance || 0)),
        );
        totalRepaid += repaidOnThisLoan;

        const payableOutstanding = this.clearRoundingDust(
          loan.outstandingBalance || 0,
        );

        if (
          loan.status === LoanStatus.ACTIVE &&
          payableOutstanding > BORROWER_MONEY.ROUNDING_DUST_THRESHOLD
        ) {
          activeLoansCount++;
          totalOutstanding += payableOutstanding;

          if (loan.nextDueDate) {
            const loanDate = new Date(this.timestampToMillis(loan.nextDueDate));
            const currentNextDate = nextDueDate
              ? new Date(this.timestampToMillis(nextDueDate))
              : null;

            if (!currentNextDate || loanDate < currentNextDate) {
              nextDueDate = loan.nextDueDate;
              nextPaymentAmount = Math.min(
                loan.monthlyInstallment || 0,
                payableOutstanding,
              );
            }
          }
        }
      });

      const pendingApplications =
        await this.getPendingApplicationsCount(borrowerId);

      const dashboard = {
        profile: profileData,
        activeLoans: activeLoansCount,
        pendingApplications,
        totalOutstanding: this.roundMoney(totalOutstanding),
        nextDueDate,
        nextPaymentAmount,
        creditScore: profileData?.creditScore || 0,
        totalBorrowed: this.roundMoney(totalBorrowed),
        totalRepaid: this.roundMoney(totalRepaid),
      };

      return {
        statusCode: 200,
        message: 'Dashboard data retrieved successfully',
        data: dashboard,
      };
    } catch (error) {
      console.error('Error fetching dashboard:', error);
      throw new InternalServerErrorException('Failed to fetch dashboard data');
    }
  }

  /**
   * Counts pending and draft applications without loading full documents.
   * Falls back to a full query if the count API isn't available.
   */
  private async getPendingApplicationsCount(
    borrowerId: string,
  ): Promise<number> {
    const query = this.db
      .collection(this.LOAN_APPS_COL)
      .where('borrowerId', '==', borrowerId)
      .where('status', 'in', [
        LoanApplicationStatus.PENDING,
        LoanApplicationStatus.UNDER_REVIEW,
      ]);

    try {
      const snapshot = await query.count().get();
      return snapshot.data().count;
    } catch {
      const snapshot = await query.get();
      return snapshot.size;
    }
  }

  /** Converts any Firestore-compatible timestamp to milliseconds, or 0 if null. */
  private timestampToMillis(value: TimestampLike): number {
    if (!value) {
      return 0;
    }

    if ('toMillis' in value && typeof value.toMillis === 'function') {
      return value.toMillis();
    }

    if ('toDate' in value && typeof value.toDate === 'function') {
      return value.toDate().getTime();
    }

    if (value instanceof Date) {
      return value.getTime();
    }

    return 0;
  }

  /** Safely casts a value to a finite number, returning a fallback when it isn't. */
  private toNumber(value: unknown, fallback = 0): number {
    return typeof value === 'number' && Number.isFinite(value)
      ? value
      : fallback;
  }

  /** Reads canonical minor units first, then a legacy major-unit field. */
  private readMajorUnitAmount(
    minorValue: unknown,
    majorValue: unknown,
    fallback = 0,
  ): number {
    if (typeof minorValue === 'number' && Number.isFinite(minorValue)) {
      return minorValue / 100;
    }

    return this.toNumber(majorValue, fallback);
  }

  private isFundedLoanStatus(status: LoanStatus): boolean {
    return [
      LoanStatus.ACTIVE,
      LoanStatus.OVERDUE,
      LoanStatus.DEFAULTED,
      LoanStatus.COMPLETED,
    ].includes(status);
  }

  private roundMoney(value: number): number {
    return Math.round(value * 100) / 100;
  }

  private clearRoundingDust(value: number): number {
    const rounded = this.roundMoney(value);
    return rounded <= BORROWER_MONEY.ROUNDING_DUST_THRESHOLD ? 0 : rounded;
  }

  /** Normalizes a raw date-like value into a Firestore Timestamp, or undefined if unresolvable. */
  private toTimestamp(value: unknown): FirebaseFirestore.Timestamp | undefined {
    if (!value) {
      return undefined;
    }

    if (typeof value === 'object' && value !== null) {
      if ('toDate' in value && typeof value.toDate === 'function') {
        const date = value.toDate();
        if (date instanceof Date) {
          return Timestamp.fromDate(date);
        }
      }
    }

    if (value instanceof Date) {
      return Timestamp.fromDate(value);
    }

    return undefined;
  }

  /** Maps raw loan state without counting unknown lifecycle states as active. */
  private normalizeLoanStatus(value: unknown): LoanStatus {
    const status = String(value ?? '').toLowerCase();

    if (Object.values(LoanStatus).includes(status as LoanStatus)) {
      return status as LoanStatus;
    }

    return LoanStatus.UNKNOWN;
  }

  /**
   * Converts a raw Firestore loan document into a typed Loan object,
   * filling in sensible numeric defaults for any missing fields.
   */
  private normalizeLoanDocument(
    data: FirebaseFirestore.DocumentData,
    documentId?: string,
  ): Loan {
    const now = Timestamp.now();
    const status = this.normalizeLoanStatus(data.status);
    const createdAt = this.toTimestamp(data.createdAt) ?? now;
    const updatedAt = this.toTimestamp(data.updatedAt) ?? createdAt;
    const startDate =
      this.toTimestamp(data.disbursedAt) ??
      this.toTimestamp(data.approvedAt) ??
      this.toTimestamp(data.startDate) ??
      createdAt;
    const nextDueDate =
      this.toTimestamp(data.firstPaymentDueAt) ??
      this.toTimestamp(data.nextDueDate) ??
      (status === LoanStatus.PENDING_DISBURSEMENT ? null : startDate);
    const endDate =
      this.toTimestamp(data.maturityDate) ??
      this.toTimestamp(data.endDate) ??
      nextDueDate ??
      startDate;

    const principalAmount = this.readMajorUnitAmount(
      data.principalMinor,
      data.principalAmount,
    );
    const tenureMonths = this.toNumber(data.tenureMonths);
    const totalInterest = this.readMajorUnitAmount(
      data.interestAmountMinor,
      data.totalInterest,
    );
    const totalRepayable = this.readMajorUnitAmount(
      data.totalRepayableMinor,
      data.totalRepayable,
      principalAmount + totalInterest,
    );
    const monthlyInstallment = this.readMajorUnitAmount(
      data.monthlyInstallmentMinor,
      data.monthlyInstallment,
      tenureMonths > 0 ? Math.round(totalRepayable / tenureMonths) : 0,
    );
    const outstandingBalance = this.readMajorUnitAmount(
      data.remainingBalanceMinor,
      data.outstandingBalance,
      status === LoanStatus.COMPLETED ? 0 : totalRepayable || principalAmount,
    );

    return {
      loanId: String(data.loanId ?? documentId ?? ''),
      requestId: String(data.requestId ?? ''),
      borrowerId: String(data.borrowerId ?? ''),
      lenderId: String(data.lenderId ?? ''),
      lenderName: data.lenderName ? String(data.lenderName) : undefined,
      principalAmount,
      interestRate: this.toNumber(data.interestRate),
      tenureMonths,
      monthlyInstallment,
      outstandingBalance,
      totalInterest,
      status,
      startDate,
      nextDueDate,
      endDate,
      repaymentsMade: this.toNumber(data.repaymentsMade),
      createdAt,
      updatedAt,
    };
  }
}
