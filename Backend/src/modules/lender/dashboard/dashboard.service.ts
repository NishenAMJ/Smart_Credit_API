import { Injectable, Logger } from '@nestjs/common';
import {
  DocumentData,
  Firestore,
  QueryDocumentSnapshot,
} from 'firebase-admin/firestore';
import { FirebaseService } from '../../../firebase/firebase.service';
import {
  hasRole,
  readDate,
  readNumber,
  readString,
} from '../../../firebase/firestore-query.utils';
import {
  computeLoanRemainingAmount,
  getLoanAmount,
  getLoanCreatedAt,
  getNormalizedInstallment,
  isActiveAd,
} from '../../../firebase/firestore-seed.utils';
import {
  BorrowerLoanSummary,
  BorrowerDetailsResponse,
  DashboardBorrower,
  DashboardBorrowersResponse,
  CursorPageInfo,
  DashboardSummaryResponse,
} from './dashboard.types';
import {
  borrowerMatchesSearch,
  createEmptyPageInfo,
  normalizeBorrowerSearch,
  paginateBorrowerItems,
} from './dashboard-borrower-query.utils';

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

  async getSummary(lenderId: string): Promise<DashboardSummaryResponse> {
    const db = this.firebaseService.getDb();
    const [
      userSnapshot,
      totalBorrowers,
      todaysCollection,
      overduePayments,
      activeAds,
    ] = await Promise.all([
      db.collection('users').doc(lenderId).get(),
      this.getTotalBorrowersFromLoans(db, lenderId),
      this.getTodaysPaymentsCollection(db, lenderId),
      this.getOverduePaymentsCount(db, lenderId),
      this.getActiveAdsCount(db, lenderId),
    ]);

    const userData = userSnapshot.data();
    const lenderName = userData?.fullName || userData?.name || 'Unnamed Lender';

    console.log(`[DashboardService] Stats for ${lenderId} (${lenderName}):`, {
      totalBorrowers,
      todaysCollection,
      overduePayments,
      activeAds,
    });

    return {
      summary: {
        lenderName,
        totalBorrowers,
        todaysCollection,
        overduePayments,
        activeAds,
      },
      generatedAt: new Date().toISOString(),
    };
  }

  async getBorrowers(
    lenderId: string,
    pageSize = 8,
    cursor?: string | null,
    search?: string | null,
  ): Promise<DashboardBorrowersResponse> {
    const db = this.firebaseService.getDb();
    const safePageSize = this.clamp(pageSize, 8, 50);

    const lenderLoansSnapshot = await db
      .collection('loans')
      .where('lenderId', '==', lenderId)
      .get();
    const lenderLoans = await Promise.all(
      lenderLoansSnapshot.docs.map((doc) => this.mapLoan(db, doc)),
    );

    return {
      ...(await this.getRecentBorrowers(
        db,
        lenderLoans,
        safePageSize,
        cursor,
        search,
      )),
      generatedAt: new Date().toISOString(),
    };
  }

  async getBorrowersForExport(lenderId: string): Promise<DashboardBorrower[]> {
    const borrowers: DashboardBorrower[] = [];
    let cursor: string | null = null;

    do {
      const page = await this.getBorrowers(lenderId, 50, cursor);
      borrowers.push(...page.borrowers);
      cursor = page.pageInfo.nextCursor;
    } while (cursor);

    return borrowers;
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

    const isBorrower =
      data &&
      (hasRole(data.role, 'borrower') || hasRole(data.roles, 'borrower'));

    if (!data || !isBorrower) {
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
      role: 'borrower',
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
        typeof data.creditScore === 'number' &&
        Number.isFinite(data.creditScore)
          ? data.creditScore
          : this.toNullableNumber(
              (data.borrowerProfile as Record<string, unknown> | undefined)
                ?.creditScore,
            ),
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

  private async getActiveAdsCount(
    db: Firestore,
    lenderId: string,
  ): Promise<number> {
    const now = new Date();

    try {
      const snapshot = await db
        .collection('loanListings')
        .where('lenderId', '==', lenderId)
        .where('status', 'in', ['active', 'approved'])
        .where('expiresAt', '>=', now)
        .count()
        .get();

      return snapshot.data().count;
    } catch (error) {
      this.logFallback(
        'active-ads',
        'Falling back from aggregate query for active ads.',
        error,
      );

      const snapshot = await db
        .collection('loanListings')
        .where('lenderId', '==', lenderId)
        .get();
      return snapshot.docs.filter((doc) => isActiveAd(doc.data(), now)).length;
    }
  }

  private async getTotalBorrowersFromLoans(
    db: Firestore,
    lenderId: string,
  ): Promise<number> {
    const snapshot = await db
      .collection('loans')
      .where('lenderId', '==', lenderId)
      .get();
    return new Set(
      snapshot.docs
        .map((doc) => readString(doc.get('borrowerId')))
        .filter((id): id is string => Boolean(id)),
    ).size;
  }

  private async getOverduePaymentsCount(
    db: Firestore,
    lenderId: string,
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
        'Falling back getOverduePaymentsCount from lender-scoped overdue installments query.',
        error,
      );

      const loansSnapshot = await db
        .collection('loans')
        .where('lenderId', '==', lenderId)
        .get();
      const counts = await Promise.all(
        loansSnapshot.docs.map(async (loan) => {
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

  private async getTodaysPaymentsCollection(
    db: Firestore,
    lenderId: string,
  ): Promise<number> {
    const { start, end } = this.getCurrentDayRange();

    try {
      const snapshot = await db
        .collection('transactions')
        .where('lenderId', '==', lenderId)
        .where('type', '==', 'repayment')
        .where('status', '==', 'completed')
        .where('createdAt', '>=', start)
        .where('createdAt', '<', end)
        .get();

      return snapshot.docs.reduce(
        (total, doc) => total + readNumber(doc.get('amountMinor')) / 100,
        0,
      );
    } catch (error) {
      this.logFallback(
        'todays-payments:lender-scope',
        'Falling back from lender-scoped todays payments query.',
        error,
      );

      const snapshot = await db
        .collection('transactions')
        .where('lenderId', '==', lenderId)
        .get();
      return snapshot.docs.reduce((total, doc) => {
        const createdAt = readDate(doc.get('createdAt'));
        const isRepayment = readString(doc.get('type')) === 'repayment';
        const isCompleted = readString(doc.get('status')) === 'completed';
        return createdAt &&
          createdAt >= start &&
          createdAt < end &&
          isRepayment &&
          isCompleted
          ? total + readNumber(doc.get('amountMinor')) / 100
          : total;
      }, 0);
    }
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
    pageSize: number,
    cursor?: string | null,
    search?: string | null,
  ): Promise<{
    borrowers: DashboardBorrower[];
    pageInfo: CursorPageInfo;
  }> {
    const searchTerm = normalizeBorrowerSearch(search);
    const borrowerLoanMap = this.groupLoansByBorrower(loans);
    const borrowerIds = Array.from(borrowerLoanMap.keys());

    if (borrowerIds.length === 0) {
      return {
        borrowers: [],
        pageInfo: createEmptyPageInfo(pageSize),
      };
    }

    const userRefs = borrowerIds.map((borrowerId) =>
      db.collection('users').doc(borrowerId),
    );
    const snapshots = await db.getAll(...userRefs);

    const borrowers = snapshots
      .map((snapshot) =>
        this.mapBorrower(
          snapshot.id,
          snapshot.data(),
          borrowerLoanMap.get(snapshot.id) ?? [],
        ),
      )
      .filter(isDashboardBorrower)
      .filter(
        (borrower) =>
          !searchTerm || borrowerMatchesSearch(borrower, searchTerm),
      )
      .sort((left, right) => {
        const leftTime = left.latestLoanCreatedAt
          ? new Date(left.latestLoanCreatedAt).getTime()
          : 0;
        const rightTime = right.latestLoanCreatedAt
          ? new Date(right.latestLoanCreatedAt).getTime()
          : 0;

        return rightTime - leftTime;
      })
      .map((borrower) => ({
        ...borrower,
        cursorDate: borrower.latestLoanCreatedAt
          ? new Date(borrower.latestLoanCreatedAt)
          : null,
        cursorId: borrower.id,
      }));

    return paginateBorrowerItems(borrowers, pageSize, cursor);
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

  private mapBorrower(
    borrowerId: string,
    data: DocumentData | undefined,
    loans: DashboardLoanRecord[],
  ): DashboardBorrower | null {
    if (
      !data ||
      (!hasRole(data.role, 'borrower') && !hasRole(data.roles, 'borrower')) ||
      loans.length === 0
    ) {
      return null;
    }

    const activeLoansCount = loans.filter(
      (loan) => loan.status === 'active',
    ).length;
    const totalBorrowedAmount = this.sum(loans.map((loan) => loan.amount));
    const outstandingAmount = this.sum(
      loans.map((loan) => loan.remainingAmount),
    );
    const latestLoan = loans.slice().sort((left, right) => {
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
      phone: typeof data.phone === 'string' ? data.phone : null,
      creditScore:
        typeof data.creditScore === 'number' &&
        Number.isFinite(data.creditScore)
          ? data.creditScore
          : this.toNullableNumber(
              (data.borrowerProfile as Record<string, unknown> | undefined)
                ?.creditScore,
            ),
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
      firstLoanCreatedAt: this.getFirstLoanCreatedAt(loans),
      isActive: data.isActive !== false,
      createdAt: this.toIsoString(data.createdAt),
    };
  }

  private getFirstLoanCreatedAt(loans: DashboardLoanRecord[]): string | null {
    const firstLoan = loans
      .filter((loan) => loan.createdAt)
      .sort(
        (left, right) => left.createdAt!.getTime() - right.createdAt!.getTime(),
      )[0];

    return firstLoan?.createdAt ? firstLoan.createdAt.toISOString() : null;
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
      interestRate: this.toNumber(data.annualInterestRate ?? data.interestRate),
      tenureMonths: this.toNumber(data.tenureMonths),
      status: typeof data.status === 'string' ? data.status : 'unknown',
      createdAt: getLoanCreatedAt(data),
    };
  }

  private mapBorrowerLoanSummary(
    loan: DashboardLoanRecord,
  ): BorrowerLoanSummary {
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

  private toNullableNumber(value: unknown): number | null {
    const numeric = this.toNumber(value);
    return numeric > 0 ? numeric : null;
  }

  private sum(values: number[]): number {
    return values.reduce((total, value) => total + value, 0);
  }
}
