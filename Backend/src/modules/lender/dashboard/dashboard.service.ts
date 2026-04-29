import { Injectable, Logger } from '@nestjs/common';
import {
  DocumentData,
  Firestore,
  QueryDocumentSnapshot,
  Query,
} from 'firebase-admin/firestore';
import { FirebaseService } from '../../../firebase/firebase.service';
import {
  applyDateCursor,
  buildPageInfo,
  decodeCursor,
  hasRole,
  encodeCursor,
  orderByDateAndId,
  readDate,
  readNumber,
  readString,
} from '../../../firebase/firestore-query.utils';
import {
  computeLoanRemainingAmount,
  getLoanAmount,
  getLoanCreatedAt,
  getNormalizedInstallment,
  getPaymentAmount,
  getPaymentCreatedAt,
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

type DashboardBorrowerPageItem = DashboardBorrower & {
  cursorDate: Date | null;
  cursorId: string;
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
    const loansSnapshot = await db
      .collection('loans')
      .where('lenderId', '==', lenderId)
      .get();
    const lenderLoans = await Promise.all(
      loansSnapshot.docs.map((doc) => this.mapLoan(db, doc)),
    );
    const [totalBorrowers, todaysCollection, overduePayments, activeAds] =
      await Promise.all([
        this.getTotalBorrowersFromRelations(db, lenderId),
        this.getTodaysPaymentsCollection(db, lenderId),
        this.getOverduePaymentsCount(db, lenderId, lenderLoans),
        this.getActiveAdsCount(db, lenderId),
      ]);

    return {
      summary: {
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
  ): Promise<DashboardBorrowersResponse> {
    const db = this.firebaseService.getDb();
    const safePageSize = this.clamp(pageSize, 8, 50);

    const relationBorrowers = await this.getBorrowersFromRelations(
      db,
      lenderId,
      safePageSize,
      cursor,
    );

    if (relationBorrowers) {
      return {
        borrowers: relationBorrowers.borrowers,
        pageInfo: relationBorrowers.pageInfo,
        generatedAt: new Date().toISOString(),
      };
    }

    const loansSnapshot = await db
      .collection('loans')
      .where('lenderId', '==', lenderId)
      .get();
    const lenderLoans = await Promise.all(
      loansSnapshot.docs.map((doc) => this.mapLoan(db, doc)),
    );

    return {
      ...(await this.getRecentBorrowers(db, lenderLoans, safePageSize, cursor)),
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
        typeof data.creditScore === 'number' &&
        Number.isFinite(data.creditScore)
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

  private async getActiveAdsCount(
    db: Firestore,
    lenderId: string,
  ): Promise<number> {
    const now = new Date();
    const activeQuery = db
      .collection('ads')
      .where('lenderId', '==', lenderId)
      .where('status', 'in', ['active', 'approved'])
      .where('expiresAt', '>=', now);

    return this.getCountWithFallback('active-ads', activeQuery, async () => {
      const snapshot = await db
        .collection('ads')
        .where('lenderId', '==', lenderId)
        .get();
      return snapshot.docs.filter((doc) => isActiveAd(doc.data(), now)).length;
    });
  }

  private async getTotalBorrowersFromRelations(
    db: Firestore,
    lenderId: string,
  ): Promise<number> {
    const query = db
      .collection('lenderBorrowers')
      .where('lenderId', '==', lenderId);

    return this.getCountWithFallback('lender-borrowers', query, async () => {
      const snapshot = await query.get();
      return snapshot.size;
    });
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
        'Falling back getOverduePaymentsCount from lender-scoped overdue installments query.',
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

  private async getTodaysPaymentsCollection(
    db: Firestore,
    lenderId: string,
  ): Promise<number> {
    const { start, end } = this.getCurrentDayRange();

    try {
      const snapshot = await db
        .collectionGroup('payments')
        .where('lenderId', '==', lenderId)
        .where('paidAt', '>=', start)
        .where('paidAt', '<', end)
        .get();

      return snapshot.docs.reduce(
        (total, doc) => total + getPaymentAmount(doc.data()),
        0,
      );
    } catch (error) {
      this.logFallback(
        'todays-payments:lender-scope',
        'Falling back from lender-scoped todays payments query.',
        error,
      );

      const loansSnapshot = await db
        .collection('loans')
        .where('lenderId', '==', lenderId)
        .get();

      return this.sumNestedPaymentsForDateRange(
        db,
        loansSnapshot.docs.map((doc) => doc.id),
        { start, end },
      );
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
  ): Promise<{
    borrowers: DashboardBorrower[];
    pageInfo: CursorPageInfo;
  }> {
    const borrowerLoanMap = this.groupLoansByBorrower(loans);
    const borrowerIds = Array.from(borrowerLoanMap.keys());

    if (borrowerIds.length === 0) {
      return {
        borrowers: [],
        pageInfo: this.createEmptyPageInfo(pageSize),
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

    return this.paginateBorrowerItems(borrowers, pageSize, cursor);
  }

  private async getBorrowersFromRelations(
    db: Firestore,
    lenderId: string,
    pageSize: number,
    cursor?: string | null,
  ): Promise<{
    borrowers: DashboardBorrower[];
    pageInfo: CursorPageInfo;
  } | null> {
    try {
      const query = db
        .collection('lenderBorrowers')
        .where('lenderId', '==', lenderId);
      const batchSize = Math.max(pageSize * 2, pageSize);
      let currentCursor = cursor ?? null;
      let exhausted = false;
      const items: DashboardBorrowerPageItem[] = [];

      while (items.length < pageSize + 1 && !exhausted) {
        const snapshot = await applyDateCursor(
          orderByDateAndId(query, 'latestLoanCreatedAt'),
          currentCursor,
        )
          .limit(batchSize)
          .get();

        if (snapshot.empty) {
          return cursor ? this.createBorrowerPage([], pageSize, false) : null;
        }

        const borrowerIds = Array.from(
          new Set(
            snapshot.docs
              .map((doc) => readString(doc.data().borrowerId))
              .filter((id): id is string => Boolean(id)),
          ),
        );
        const userDataById = await this.getUsersByIds(db, borrowerIds);

        for (const doc of snapshot.docs) {
          const mapped = this.mapBorrowerFromRelation(doc.data(), userDataById);

          if (!mapped) {
            continue;
          }

          items.push({
            ...mapped,
            cursorDate: readDate(doc.get('latestLoanCreatedAt')),
            cursorId: doc.id,
          });

          if (items.length >= pageSize + 1) {
            break;
          }
        }

        const lastDoc = snapshot.docs[snapshot.docs.length - 1];
        currentCursor = encodeCursor(
          readDate(lastDoc.get('latestLoanCreatedAt')),
          lastDoc.id,
        );
        exhausted = snapshot.docs.length < batchSize || !currentCursor;
      }

      return this.createBorrowerPage(
        items.slice(0, pageSize),
        pageSize,
        items.length > pageSize,
      );
    } catch (error) {
      this.logFallback(
        'borrowers:lender-relations',
        'Falling back from lenderBorrowers borrower list query.',
        error,
      );
      return null;
    }
  }

  private async getUsersByIds(
    db: Firestore,
    borrowerIds: string[],
  ): Promise<Map<string, DocumentData | undefined>> {
    if (borrowerIds.length === 0) {
      return new Map();
    }

    const userRefs = borrowerIds.map((borrowerId) =>
      db.collection('users').doc(borrowerId),
    );
    const userSnapshots = await db.getAll(...userRefs);

    return new Map(
      userSnapshots.map((snapshot) => [snapshot.id, snapshot.data()]),
    );
  }

  private mapBorrowerFromRelation(
    relation: DocumentData,
    userDataById: Map<string, DocumentData | undefined>,
  ): DashboardBorrower | null {
    const borrowerId = readString(relation.borrowerId);

    if (!borrowerId) {
      return null;
    }

    const userData = userDataById.get(borrowerId);
    const activeLoansCount = readNumber(
      relation.activeLoanCount,
      relation.activeLoansCount,
    );
    const totalLoans = readNumber(
      relation.totalLoans,
      relation.loanCount,
      activeLoansCount,
    );
    const createdAt =
      this.toIsoString(relation.latestLoanCreatedAt) ??
      this.toIsoString(relation.updatedAt) ??
      this.toIsoString(relation.createdAt);

    return {
      id: borrowerId,
      fullName:
        readString(
          relation.borrowerName,
          userData?.fullName,
          userData?.displayName,
        ) ?? 'Unnamed borrower',
      email: readString(userData?.email) ?? 'No email',
      creditScore:
        typeof userData?.creditScore === 'number' &&
        Number.isFinite(userData.creditScore)
          ? userData.creditScore
          : this.toNullableNumber(relation.borrowerCreditScore),
      kycStatus:
        readString(userData?.kycStatus, relation.borrowerKycStatus) ??
        'not_submitted',
      loanCount: totalLoans,
      activeLoansCount,
      totalBorrowedAmount: readNumber(
        relation.totalPrincipalAmount,
        relation.totalBorrowedAmount,
      ),
      outstandingAmount: readNumber(
        relation.outstandingAmount,
        relation.totalOutstandingAmount,
      ),
      latestLoanStatus: readString(relation.latestLoanStatus) ?? 'unknown',
      latestLoanCreatedAt: createdAt,
      isActive: userData?.isActive !== false,
      createdAt: this.toIsoString(userData?.createdAt),
    };
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

  private mapBorrower(
    borrowerId: string,
    data: DocumentData | undefined,
    loans: DashboardLoanRecord[],
  ): DashboardBorrower | null {
    if (!data || !hasRole(data.role, 'borrower') || loans.length === 0) {
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
      creditScore:
        typeof data.creditScore === 'number' &&
        Number.isFinite(data.creditScore)
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

  private paginateBorrowerItems(
    borrowers: DashboardBorrowerPageItem[],
    pageSize: number,
    cursor?: string | null,
  ): {
    borrowers: DashboardBorrower[];
    pageInfo: CursorPageInfo;
  } {
    const decodedCursor = decodeCursor(cursor);
    const startIndex = decodedCursor
      ? borrowers.findIndex((borrower) =>
          this.isBorrowerAfterCursor(borrower, decodedCursor),
        )
      : 0;
    const safeStartIndex = startIndex < 0 ? borrowers.length : startIndex;
    const pagedBorrowers = borrowers.slice(
      safeStartIndex,
      safeStartIndex + pageSize + 1,
    );

    return this.createBorrowerPage(
      pagedBorrowers.slice(0, pageSize),
      pageSize,
      pagedBorrowers.length > pageSize,
    );
  }

  private createBorrowerPage(
    borrowers: DashboardBorrowerPageItem[],
    pageSize: number,
    hasMore: boolean,
  ): {
    borrowers: DashboardBorrower[];
    pageInfo: CursorPageInfo;
  } {
    return {
      borrowers: borrowers.map(
        ({ cursorDate: _cursorDate, cursorId: _cursorId, ...borrower }) =>
          borrower,
      ),
      pageInfo: buildPageInfo(borrowers, pageSize, hasMore),
    };
  }

  private createEmptyPageInfo(pageSize: number): CursorPageInfo {
    return {
      pageSize,
      hasMore: false,
      nextCursor: null,
    };
  }

  private isBorrowerAfterCursor(
    borrower: DashboardBorrowerPageItem,
    cursor: { date: Date; id: string },
  ): boolean {
    const borrowerTime = borrower.cursorDate
      ? borrower.cursorDate.getTime()
      : 0;
    const cursorTime = cursor.date.getTime();

    if (borrowerTime !== cursorTime) {
      return borrowerTime < cursorTime;
    }

    return borrower.cursorId.localeCompare(cursor.id) < 0;
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
            const paymentsSnapshot = await installmentDoc.ref
              .collection('payments')
              .get();

            return paymentsSnapshot.docs.reduce((total, paymentDoc) => {
              const data = paymentDoc.data();
              const createdAt = getPaymentCreatedAt(data);

              if (
                !createdAt ||
                createdAt < range.start ||
                createdAt >= range.end
              ) {
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
