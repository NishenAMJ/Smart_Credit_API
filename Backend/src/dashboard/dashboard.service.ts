import { Injectable, Logger } from '@nestjs/common';
import {
  DocumentData,
  Firestore,
  QueryDocumentSnapshot,
  Query,
} from 'firebase-admin/firestore';
import { FirebaseService } from '../firebase/firebase.service';
import { chunkValues, hasRole, readDate, readNumber } from '../firebase/firestore-query.utils';
import {
  computeLoanRemainingAmount,
  getInstallmentAmount,
  getLoanAmount,
  getLoanCreatedAt,
  getNormalizedInstallment,
  getPaymentAmount,
  getPaymentCreatedAt,
  isActiveAd,
} from '../firebase/firestore-seed.utils';
import {
  BorrowerLoanSummary,
  BorrowerDetailsResponse,
  DashboardBorrower,
  DashboardOverviewResponse,
} from './dashboard.types';

type DashboardLoanRecord = {
  id: string;
  borrowerId: string | null;
  amount: number;
  remainingAmount: number;
  interestRate: number;
  tenureMonths: number;
  status: string;
  createdAt: Date | null;
};

function isDashboardBorrower(
  borrower: DashboardBorrower | null,
): borrower is DashboardBorrower {
  return borrower !== null;
}

@Injectable()
export class DashboardService {
  private readonly logger = new Logger(DashboardService.name);
  private readonly warnedFallbacks = new Set<string>();

  constructor(private readonly firebaseService: FirebaseService) {}

  async getOverview(
    lenderId: string,
    limit = 24,
  ): Promise<DashboardOverviewResponse> {
    const db = this.firebaseService.getDb();
    const safeLimit = this.clamp(limit, 8, 50);
    const loansSnapshot = await db
      .collection('loans')
      .where('lenderId', '==', lenderId)
      .get();
    const lenderLoans = await Promise.all(
      loansSnapshot.docs.map((doc) => this.mapLoan(db, doc)),
    );
    const loanIds = new Set(lenderLoans.map((loan) => loan.id));

    const [
      totalBorrowers,
      todaysCollection,
      overduePayments,
      activeAds,
      recentBorrowers,
    ] = await Promise.all([
      Promise.resolve(this.getBorrowerCount(lenderLoans)),
      this.getTodaysCollection(db, lenderId, loanIds),
      this.getOverduePaymentsCount(db, lenderId, lenderLoans),
      this.getActiveAdsCount(db, lenderId),
      this.getRecentBorrowers(db, lenderLoans, safeLimit),
    ]);

    return {
      summary: {
        totalBorrowers,
        todaysCollection,
        overduePayments,
        activeAds,
      },
      recentBorrowers,
      generatedAt: new Date().toISOString(),
    };
  }

  async getBorrowerDetails(
    lenderId: string,
    borrowerId: string,
  ): Promise<BorrowerDetailsResponse | null> {
    const db = this.firebaseService.getDb();
    const [snapshot, loansSnapshot] = await Promise.all([
      db.collection('users').doc(borrowerId).get(),
      db
        .collection('loans')
        .where('lenderId', '==', lenderId)
        .where('borrowerId', '==', borrowerId)
        .get(),
    ]);

    if (!snapshot.exists) {
      return null;
    }

    const data = snapshot.data();

    if (!data || !hasRole(data.role, 'borrower')) {
      return null;
    }

    const lenderLoans = await Promise.all(
      loansSnapshot.docs.map((doc) => this.mapLoan(db, doc)),
    );

    if (lenderLoans.length === 0) {
      return null;
    }

    const activeLoansCount = lenderLoans.filter(
      (loan) => loan.status === 'active',
    ).length;
    const totalBorrowedAmount = this.sum(
      lenderLoans.map((loan) => loan.amount),
    );
    const outstandingAmount = this.sum(
      lenderLoans.map((loan) => loan.remainingAmount),
    );

    return {
      id: snapshot.id,
      role: hasRole(data.role, 'borrower') ? 'borrower' : 'unknown',
      fullName:
        typeof data.fullName === 'string' && data.fullName.trim().length > 0
          ? data.fullName
          : 'Unnamed borrower',
      email: typeof data.email === 'string' ? data.email : 'No email',
      phone: typeof data.phone === 'string' ? data.phone : null,
      address: typeof data.address === 'string' ? data.address : null,
      nic: typeof data.nic === 'string' ? data.nic : null,
      kycStatus:
        typeof data.kycStatus === 'string' ? data.kycStatus : 'not_submitted',
      creditScore:
        typeof data.creditScore === 'number' && Number.isFinite(data.creditScore)
          ? data.creditScore
          : null,
      rating:
        typeof data.rating === 'number' && Number.isFinite(data.rating)
          ? data.rating
          : null,
      loanCount: lenderLoans.length,
      activeLoansCount,
      totalBorrowedAmount,
      outstandingAmount,
      isActive: data.isActive !== false,
      createdAt: this.toIsoString(data.createdAt),
      loans: lenderLoans
        .slice()
        .sort((left, right) => {
          const leftTime = left.createdAt ? left.createdAt.getTime() : 0;
          const rightTime = right.createdAt ? right.createdAt.getTime() : 0;

          return rightTime - leftTime;
        })
        .map((loan) => this.mapBorrowerLoanSummary(loan)),
    };
  }

  private clamp(value: number, min: number, max: number): number {
    return Math.min(Math.max(value, min), max);
  }

  private getBorrowerCount(loans: DashboardLoanRecord[]): number {
    return new Set(
      loans
        .map((loan) => loan.borrowerId)
        .filter((borrowerId): borrowerId is string => Boolean(borrowerId)),
    ).size;
  }

  private async getActiveAdsCount(
    db: Firestore,
    lenderId: string,
  ): Promise<number> {
    const snapshot = await db.collection('ads').where('lenderId', '==', lenderId).get();
    return snapshot.docs.filter((doc) => isActiveAd(doc.data())).length;
  }

  private async getOverduePaymentsCount(
    db: Firestore,
    lenderId: string,
    loans: DashboardLoanRecord[],
  ): Promise<number> {
    try {
      const snapshot = await db
        .collectionGroup('installments')
        .where('lenderId', '==', lenderId)
        .where('status', '==', 'overdue')
        .count()
        .get();

      return snapshot.data().count;
    } catch (error) {
      this.logFallback(
        'overdue-installments:lender-scope',
        'Falling back from lender-scoped overdue installments query.',
        error,
      );

      const counts = await Promise.all(
        loans.map(async (loan) => {
          const snapshot = await db
            .collection('loans')
            .doc(loan.id)
            .collection('installments')
            .get();

          return snapshot.docs.filter((doc) => {
            const installment = getNormalizedInstallment(doc.data());
            return installment.status === 'overdue';
          }).length;
        }),
      );

      return counts.reduce((total, count) => total + count, 0);
    }
  }

  private async getTodaysCollection(
    db: Firestore,
    lenderId: string,
    loanIds: Set<string>,
  ): Promise<number> {
    if (loanIds.size === 0) {
      return 0;
    }

    const { start, end } = this.getCurrentDayRange();
    try {
      const snapshot = await db
        .collection('transactions')
        .where('lenderId', '==', lenderId)
        .where('type', '==', 'repayment')
        .where('createdAt', '>=', start)
        .where('createdAt', '<', end)
        .get();

      if (snapshot.size > 0) {
        return this.sumRepaymentTransactions(snapshot.docs, loanIds, { start, end });
      }
    } catch (error) {
      this.logFallback(
        'todays-collection:lender-scope',
        'Falling back from lender-scoped todays collection query.',
        error,
      );
    }

    const snapshots = await Promise.all(
      chunkValues(Array.from(loanIds), 10).map((loanIdChunk) =>
        db
          .collection('transactions')
          .where('loanId', 'in', loanIdChunk)
          .where('type', '==', 'repayment')
          .get(),
      ),
    );

    const topLevelTotal = this.sumRepaymentTransactions(
      snapshots.flatMap((snapshot) => snapshot.docs),
      loanIds,
      { start, end },
    );

    if (topLevelTotal > 0) {
      return topLevelTotal;
    }

    return this.sumNestedPaymentsForDateRange(db, Array.from(loanIds), { start, end });
  }

  private getCurrentDayRange(): { start: Date; end: Date } {
    const start = new Date();
    start.setHours(0, 0, 0, 0);

    const end = new Date(start);
    end.setDate(end.getDate() + 1);

    return { start, end };
  }

  private async getRecentBorrowers(
    db: Firestore,
    loans: DashboardLoanRecord[],
    limit: number,
  ): Promise<DashboardBorrower[]> {
    const borrowerLoanMap = this.groupLoansByBorrower(loans);
    const borrowerIds = Array.from(borrowerLoanMap.keys());

    if (borrowerIds.length === 0) {
      return [];
    }

    const userRefs = borrowerIds.map((borrowerId) =>
      db.collection('users').doc(borrowerId),
    );
    const snapshots = await db.getAll(...userRefs);

    return snapshots
      .map((snapshot) =>
        this.mapBorrower(snapshot.id, snapshot.data(), borrowerLoanMap.get(snapshot.id) ?? []),
      )
      .filter(isDashboardBorrower)
      .sort((left, right) => {
        const leftTime = left.latestLoanCreatedAt
          ? new Date(left.latestLoanCreatedAt).getTime()
          : 0;
        const rightTime = right.latestLoanCreatedAt
          ? new Date(right.latestLoanCreatedAt).getTime()
          : 0;

        return rightTime - leftTime;
      })
      .slice(0, limit);
  }

  private async getCountWithFallback(
    label: string,
    query: Query<DocumentData>,
    fallback: () => Promise<number>,
  ): Promise<number> {
    try {
      const snapshot = await query.count().get();
      return snapshot.data().count;
    } catch (error) {
      this.logFallback(
        `aggregate:${label}`,
        `Falling back from aggregate query for ${label}.`,
        error,
      );
      return fallback();
    }
  }

  private logFallback(key: string, message: string, error: unknown): void {
    if (this.warnedFallbacks.has(key)) {
      return;
    }

    this.warnedFallbacks.add(key);

    const errorCode = this.getFirestoreErrorCode(error);
    const suffix = errorCode ? ` Firestore code: ${errorCode}.` : '';
    this.logger.warn(`${message}${suffix}`);
  }

  private getFirestoreErrorCode(error: unknown): string | null {
    if (
      typeof error === 'object' &&
      error !== null &&
      'code' in error &&
      (typeof error.code === 'number' || typeof error.code === 'string')
    ) {
      return String(error.code);
    }

    return null;
  }

  private sumRepaymentTransactions(
    docs: QueryDocumentSnapshot<DocumentData>[],
    loanIds: Set<string>,
    dateRange?: { start: Date; end: Date },
  ): number {
    return docs.reduce((total, doc) => {
      const data = doc.data();
      const amount =
        typeof data.amount === 'number' && Number.isFinite(data.amount)
          ? data.amount
          : 0;

      if (data.type !== 'repayment') {
        return total;
      }

      if (
        typeof data.loanId !== 'string' ||
        !loanIds.has(data.loanId)
      ) {
        return total;
      }

      if (!dateRange) {
        return total + amount;
      }

      const createdAt = this.toDate(data.createdAt);

      if (!createdAt) {
        return total;
      }

      return createdAt >= dateRange.start && createdAt < dateRange.end
        ? total + amount
        : total;
    }, 0);
  }

  private mapBorrower(
    borrowerId: string,
    data: DocumentData | undefined,
    loans: DashboardLoanRecord[],
  ): DashboardBorrower | null {
    if (!data || !hasRole(data.role, 'borrower') || loans.length === 0) {
      return null;
    }

    const activeLoansCount = loans.filter((loan) => loan.status === 'active').length;
    const totalBorrowedAmount = this.sum(loans.map((loan) => loan.amount));
    const outstandingAmount = this.sum(loans.map((loan) => loan.remainingAmount));
    const latestLoan = loans
      .slice()
      .sort((left, right) => {
        const leftTime = left.createdAt ? left.createdAt.getTime() : 0;
        const rightTime = right.createdAt ? right.createdAt.getTime() : 0;

        return rightTime - leftTime;
      })[0];

    return {
      id: borrowerId,
      fullName:
        typeof data.fullName === 'string' && data.fullName.trim().length > 0
          ? data.fullName
          : 'Unnamed borrower',
      email: typeof data.email === 'string' ? data.email : 'No email',
      creditScore:
        typeof data.creditScore === 'number' && Number.isFinite(data.creditScore)
          ? data.creditScore
          : null,
      kycStatus:
        typeof data.kycStatus === 'string' ? data.kycStatus : 'not_submitted',
      loanCount: loans.length,
      activeLoansCount,
      totalBorrowedAmount,
      outstandingAmount,
      latestLoanStatus: latestLoan?.status ?? 'unknown',
      latestLoanCreatedAt: latestLoan?.createdAt
        ? latestLoan.createdAt.toISOString()
        : null,
      isActive: data.isActive !== false,
      createdAt: this.toIsoString(data.createdAt),
    };
  }

  private async mapLoan(
    db: Firestore,
    doc: QueryDocumentSnapshot<DocumentData>,
  ): Promise<DashboardLoanRecord> {
    const data = doc.data();

    return {
      id: doc.id,
      borrowerId: typeof data.borrowerId === 'string' ? data.borrowerId : null,
      amount: getLoanAmount(data),
      remainingAmount: await computeLoanRemainingAmount(db, doc.id, data),
      interestRate: this.toNumber(data.interestRate),
      tenureMonths: this.toNumber(data.tenureMonths),
      status: typeof data.status === 'string' ? data.status : 'unknown',
      createdAt: getLoanCreatedAt(data),
    };
  }

  private mapBorrowerLoanSummary(loan: DashboardLoanRecord): BorrowerLoanSummary {
    return {
      id: loan.id,
      status: loan.status,
      amount: loan.amount,
      remainingAmount: loan.remainingAmount,
      interestRate: loan.interestRate,
      tenureMonths: loan.tenureMonths,
      createdAt: loan.createdAt ? loan.createdAt.toISOString() : null,
    };
  }

  private groupLoansByBorrower(
    loans: DashboardLoanRecord[],
  ): Map<string, DashboardLoanRecord[]> {
    const grouped = new Map<string, DashboardLoanRecord[]>();

    loans.forEach((loan) => {
      if (!loan.borrowerId) {
        return;
      }

      const existing = grouped.get(loan.borrowerId) ?? [];
      existing.push(loan);
      grouped.set(loan.borrowerId, existing);
    });

    return grouped;
  }

  private toIsoString(value: unknown): string | null {
    const asDate = this.toDate(value);

    return asDate ? asDate.toISOString() : null;
  }

  private toDate(value: unknown): Date | null {
    return readDate(value);
  }

  private toNumber(value: unknown): number {
    return readNumber(value);
  }

  private sum(values: number[]): number {
    return values.reduce((total, value) => total + value, 0);
  }

  private async sumNestedPaymentsForDateRange(
    db: Firestore,
    loanIds: string[],
    range: { start: Date; end: Date },
  ): Promise<number> {
    const totals = await Promise.all(
      loanIds.map(async (loanId) => {
        const installmentsSnapshot = await db
          .collection('loans')
          .doc(loanId)
          .collection('installments')
          .get();

        const installmentTotals = await Promise.all(
          installmentsSnapshot.docs.map(async (installmentDoc) => {
            const paymentsSnapshot = await installmentDoc.ref.collection('payments').get();

            return paymentsSnapshot.docs.reduce((total, paymentDoc) => {
              const data = paymentDoc.data();
              const createdAt = getPaymentCreatedAt(data);

              if (!createdAt || createdAt < range.start || createdAt >= range.end) {
                return total;
              }

              return total + getPaymentAmount(data);
            }, 0);
          }),
        );

        return this.sum(installmentTotals);
      }),
    );

    return this.sum(totals);
  }
}
