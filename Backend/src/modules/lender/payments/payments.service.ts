import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import {
  DocumentData,
  FieldValue,
  Firestore,
  QueryDocumentSnapshot,
  Timestamp,
} from 'firebase-admin/firestore';
import { FirebaseService } from '../../../firebase/firebase.service';
import { repaymentTransactionIdFor } from '../../../common/firestore/schema';
import {
  buildPageInfo,
  chunkValues,
  decodeCursor,
  readDate,
  readNumber,
} from '../../../firebase/firestore-query.utils';
import {
  getNormalizedInstallment,
  getLoanCreatedAt,
} from '../../../firebase/firestore-seed.utils';
import {
  LoanLedgerDetailsResponse,
  RecordInstallmentPaymentInput,
  PaymentListItem,
  PaymentsResponse,
  PaymentsSummary,
} from './payments.types';

type LoanRecord = {
  id: string;
  borrowerId: string | null;
  amount: number;
  remainingAmount: number;
  interestRate: number;
  tenureMonths: number;
  status: string;
  createdAt: Date | null;
};

type TransactionRecord = {
  id: string;
  loanId: string | null;
  installmentId: string | null;
  paymentId: string | null;
  type: string;
  status: string;
  amount: number;
  createdAt: Date | null;
  source: 'payment' | 'transaction';
  note: string | null;
};

type BorrowerProfile = {
  fullName: string;
  email: string;
};

type InstallmentRecord = {
  id: string;
  status: string;
  dueDate: Date | null;
  amount: number;
  paidAmount: number;
};

type CachedValue<T> = {
  expiresAt: number;
  value: T;
};

type LenderLedgerContext = {
  lenderId: string;
  loans: LoanRecord[];
  loanIds: Set<string>;
  loanIdsList: string[];
  loanMap: Map<string, LoanRecord>;
  borrowerMap: Map<string, BorrowerProfile>;
};

@Injectable()
export class PaymentsService {
  private readonly logger = new Logger(PaymentsService.name);
  private readonly cacheTtlMs = 60_000;
  private readonly lenderContextCache = new Map<
    string,
    CachedValue<LenderLedgerContext>
  >();
  private readonly summaryCache = new Map<
    string,
    CachedValue<PaymentsSummary>
  >();
  private readonly searchCountCache = new Map<string, CachedValue<number>>();

  constructor(private readonly firebaseService: FirebaseService) {}

  async getPayments(
    lenderId: string,
    pageSize = 30,
    cursor?: string | null,
    includeSummary = true,
    includeSearchCount = true,
    search?: string | null,
  ): Promise<PaymentsResponse> {
    const safePageSize = this.clamp(pageSize, 8, 60);
    const normalizedSearch = this.normalizeSearch(search);
    const context = await this.getLenderContext(lenderId);
    const { loanIds, loanIdsList, loanMap, borrowerMap } = context;

    if (loanIds.size === 0) {
      return {
        lenderId,
        summary: this.createEmptySummary(),
        searchResultCount: null,
        transactions: [],
        pageInfo: {
          pageSize: safePageSize,
          hasMore: false,
          nextCursor: null,
        },
        generatedAt: new Date().toISOString(),
      };
    }

    const pagedTransactions = await this.getRecentPaymentsPage(
      context,
      safePageSize,
      cursor,
      normalizedSearch,
    );
    const visibleTransactions = pagedTransactions.items.slice(0, safePageSize);
    const activeLoanIds: string[] = Array.from(
      new Set<string>(
        visibleTransactions
          .map((transaction) => transaction.loanId)
          .filter((loanId): loanId is string => Boolean(loanId)),
      ),
    );
    const installmentSummaries =
      await this.getInstallmentSummaries(activeLoanIds);
    const summary = includeSummary
      ? await this.getSummaryForLender(lenderId, loanIds, loanIdsList)
      : this.createEmptySummary();
    const searchResultCount =
      normalizedSearch && includeSearchCount
        ? await this.getSearchResultCount(lenderId, context, normalizedSearch)
        : null;

    const transactions: PaymentListItem[] = visibleTransactions.map(
      (transaction) => {
        const loan = transaction.loanId
          ? loanMap.get(transaction.loanId)
          : undefined;
        const borrower = loan?.borrowerId
          ? borrowerMap.get(loan.borrowerId)
          : undefined;
        const installmentSummary = (transaction.loanId
          ? installmentSummaries.get(transaction.loanId)
          : undefined) ?? {
          totalInstallments: 0,
          paidInstallments: 0,
          overdueInstallments: 0,
          nextDueDate: null,
          latestInstallmentStatus: 'unknown',
        };

        return {
          transactionId: transaction.id,
          loanId: transaction.loanId ?? 'unknown-loan',
          installmentId: transaction.installmentId,
          borrowerId: loan?.borrowerId ?? 'unknown-borrower',
          borrowerName: borrower?.fullName ?? 'Unknown borrower',
          borrowerEmail: borrower?.email ?? 'No email',
          amount: transaction.amount,
          type: transaction.type,
          status: transaction.status,
          createdAt: transaction.createdAt
            ? transaction.createdAt.toISOString()
            : null,
          loanStatus: loan?.status ?? 'unknown',
          remainingAmount: loan?.remainingAmount ?? 0,
          source: transaction.source,
          installmentSummary,
        };
      },
    );

    return {
      lenderId,
      summary,
      searchResultCount,
      transactions,
      pageInfo: buildPageInfo(
        visibleTransactions.map((transaction) => ({
          ...transaction,
          cursorDate: transaction.createdAt,
          cursorId: transaction.id,
        })),
        safePageSize,
        pagedTransactions.items.length > safePageSize,
      ),
      generatedAt: new Date().toISOString(),
    };
  }

  async getLoanLedgerDetails(
    lenderId: string,
    loanId: string,
  ): Promise<LoanLedgerDetailsResponse | null> {
    const db = this.firebaseService.getDb();
    const loanSnapshot = await db.collection('loans').doc(loanId).get();

    if (!loanSnapshot.exists) {
      return null;
    }

    const loan = await this.mapLoanSnapshot(
      db,
      loanSnapshot.id,
      loanSnapshot.data() ?? {},
    );

    if (!loan || loanSnapshot.get('lenderId') !== lenderId) {
      return null;
    }

    return this.buildLoanLedgerDetails(lenderId, loanSnapshot.id, loan);
  }

  async recordInstallmentPayment(
    lenderId: string,
    loanId: string,
    installmentId: string,
    input: RecordInstallmentPaymentInput,
  ): Promise<LoanLedgerDetailsResponse | null> {
    const db = this.firebaseService.getDb();
    const loanRef = db.collection('loans').doc(loanId);
    const installmentRef = loanRef
      .collection('installments')
      .doc(installmentId);
    const parsedPaidAt =
      input.paidAt && input.paidAt.trim().length > 0
        ? this.toDate(input.paidAt)
        : new Date();

    if (!parsedPaidAt) {
      throw new BadRequestException('A valid payment date is required.');
    }

    if (input.amount <= 0) {
      throw new BadRequestException(
        'Payment amount must be greater than zero.',
      );
    }

    const details = await db.runTransaction(async (transaction) => {
      const [loanSnapshot, installmentSnapshot] = await Promise.all([
        transaction.get(loanRef),
        transaction.get(installmentRef),
      ]);

      if (!loanSnapshot.exists || !installmentSnapshot.exists) {
        return null;
      }

      if (loanSnapshot.get('lenderId') !== lenderId) {
        return null;
      }

      const loan = await this.mapLoanSnapshot(
        db,
        loanSnapshot.id,
        loanSnapshot.data() ?? {},
      );
      const installment = this.mapInstallmentSnapshot(
        installmentSnapshot.id,
        installmentSnapshot.data() ?? {},
      );

      const currentPaidAmount = installment.paidAmount;
      const installmentOutstanding = Math.max(
        0,
        installment.amount - currentPaidAmount,
      );

      if (installmentOutstanding <= 0) {
        throw new BadRequestException(
          'This installment is already fully paid.',
        );
      }

      if (input.amount !== installmentOutstanding) {
        throw new BadRequestException(
          `This installment must be settled in full with ${installmentOutstanding}.`,
        );
      }

      const nextRemainingAmount = Math.max(
        0,
        loan.remainingAmount - input.amount,
      );
      const loanStatus =
        nextRemainingAmount <= 0
          ? 'completed'
          : loan.status === 'completed'
            ? 'active'
            : loan.status;
      const transactionId = repaymentTransactionIdFor(loanId, installmentId);
      const transactionRef = db.collection('transactions').doc(transactionId);
      const paymentTimestamp = Timestamp.fromDate(parsedPaidAt);
      const note = this.normalizeNote(input.note);

      transaction.create(transactionRef, {
        transactionId,
        loanId,
        installmentId,
        listingId: loanSnapshot.get('listingId') ?? null,
        amountMinor: Math.round(input.amount * 100),
        currency: 'LKR',
        createdAt: paymentTimestamp,
        completedAt: paymentTimestamp,
        type: 'repayment',
        status: 'completed',
        paymentMethod: 'bank_transfer',
        externalReference: null,
        idempotencyKey: transactionId,
        receiptDocumentId: null,
        note,
        lenderId,
        borrowerId: loan.borrowerId,
        initiatedByUserId: lenderId,
      });

      transaction.update(installmentRef, {
        status: 'paid',
        paidTransactionId: transactionId,
        paidAt: paymentTimestamp,
        note,
        updatedAt: FieldValue.serverTimestamp(),
      });

      transaction.update(loanRef, {
        amountPaidMinor: Math.round(
          this.toNumber(loanSnapshot.get('amountPaidMinor')) +
            input.amount * 100,
        ),
        remainingBalanceMinor: Math.round(nextRemainingAmount * 100),
        status: loanStatus,
        completedAt: nextRemainingAmount <= 0 ? paymentTimestamp : null,
        updatedAt: FieldValue.serverTimestamp(),
      });

      return true;
    });

    if (!details) {
      return null;
    }

    const refreshedLoanSnapshot = await loanRef.get();

    if (!refreshedLoanSnapshot.exists) {
      return null;
    }

    this.invalidateLenderCaches(lenderId);

    return this.buildLoanLedgerDetails(
      lenderId,
      refreshedLoanSnapshot.id,
      await this.mapLoanSnapshot(
        db,
        refreshedLoanSnapshot.id,
        refreshedLoanSnapshot.data() ?? {},
      ),
    );
  }

  private async getLenderContext(
    lenderId: string,
  ): Promise<LenderLedgerContext> {
    const cached = this.getCachedValue(this.lenderContextCache, lenderId);

    if (cached) {
      return cached;
    }

    const db = this.firebaseService.getDb();
    const loansSnapshot = await db
      .collection('loans')
      .where('lenderId', '==', lenderId)
      .get();
    const loans = await Promise.all(
      loansSnapshot.docs.map((doc) => this.mapLoan(db, doc)),
    );
    const loanIdsList = loans.map((loan) => loan.id);
    const uniqueBorrowerIds: string[] = Array.from(
      new Set<string>(
        loans
          .map((loan) => loan.borrowerId)
          .filter((borrowerId): borrowerId is string => Boolean(borrowerId)),
      ),
    );
    const borrowerMap = await this.getBorrowerMap(uniqueBorrowerIds);
    const context = {
      lenderId,
      loans,
      loanIds: new Set<string>(loanIdsList),
      loanIdsList,
      loanMap: new Map<string, LoanRecord>(
        loans.map((loan) => [loan.id, loan] as const),
      ),
      borrowerMap,
    } satisfies LenderLedgerContext;

    this.setCachedValue(this.lenderContextCache, lenderId, context);

    return context;
  }

  private async getSummaryForLender(
    lenderId: string,
    loanIds: Set<string>,
    loanIdsList: string[],
  ): Promise<PaymentsSummary> {
    const cached = this.getCachedValue(this.summaryCache, lenderId);

    if (cached) {
      return cached;
    }

    const allScopedTransactions = await this.getAllRecentPayments(
      lenderId,
      loanIds,
    );
    const installmentSummaries =
      await this.getInstallmentSummaries(loanIdsList);
    const summary = {
      totalTransactions: allScopedTransactions.length,
      totalCollected: this.sum(
        allScopedTransactions.map((transaction) => transaction.amount),
      ),
      loansWithActivity: new Set(
        allScopedTransactions
          .map((transaction) => transaction.loanId)
          .filter((loanId): loanId is string => Boolean(loanId)),
      ).size,
      overdueInstallments: Array.from(installmentSummaries.values()).reduce(
        (total, currentSummary) => total + currentSummary.overdueInstallments,
        0,
      ),
    } satisfies PaymentsSummary;

    this.setCachedValue(this.summaryCache, lenderId, summary);

    return summary;
  }

  private async getSearchResultCount(
    lenderId: string,
    context: LenderLedgerContext,
    search: string,
  ): Promise<number> {
    const cacheKey = `${lenderId}:${search}`;
    const cached = this.getCachedValue(this.searchCountCache, cacheKey);

    if (cached !== null) {
      return cached;
    }

    const allScopedTransactions = await this.getAllRecentPayments(
      lenderId,
      context.loanIds,
    );
    const count = allScopedTransactions.filter((transaction) =>
      this.matchesSearch(transaction, context, search),
    ).length;

    this.setCachedValue(this.searchCountCache, cacheKey, count);

    return count;
  }

  private async getRecentPaymentsPage(
    context: LenderLedgerContext,
    pageSize: number,
    cursor?: string | null,
    search?: string | null,
  ): Promise<{ items: TransactionRecord[] }> {
    const items = this.paginateTransactions(
      (await this.getTopLevelRepaymentsByLoanIds(context.loanIds)).filter(
        (transaction) =>
          this.matchesTransactionFilters(transaction, context, search ?? null),
      ),
      pageSize,
      cursor,
    );

    return { items };
  }

  private async getAllRecentPayments(
    _lenderId: string,
    loanIds: Set<string>,
  ): Promise<TransactionRecord[]> {
    return this.getTopLevelRepaymentsByLoanIds(loanIds);
  }

  private async getRecentPaymentsForLender(
    lenderId: string,
    limit: number,
  ): Promise<TransactionRecord[] | null> {
    const context = await this.getLenderContext(lenderId);

    if (context.loanIds.size === 0) {
      return [];
    }

    return (await this.getRecentPaymentsPage(context, limit)).items.slice(
      0,
      limit,
    );
  }

  private async buildLoanLedgerDetails(
    lenderId: string,
    loanId: string,
    loan: LoanRecord,
  ): Promise<LoanLedgerDetailsResponse> {
    const db = this.firebaseService.getDb();
    const installmentsSnapshot = await db
      .collection('loans')
      .doc(loanId)
      .collection('installments')
      .get();
    const installments = installmentsSnapshot.docs.map((installmentDoc) => {
      const installment = this.mapInstallment(installmentDoc);
      const data = installmentDoc.data();
      const lastPaymentAt = readDate(data.lastPaymentAt ?? data.paidAt);

      return {
        id: installment.id,
        status: installment.status,
        dueDate: installment.dueDate ? installment.dueDate.toISOString() : null,
        amount: installment.amount,
        paidAmount: installment.paidAmount,
        lastPaymentAt: lastPaymentAt ? lastPaymentAt.toISOString() : null,
        note: this.normalizeNote(data.note),
      };
    });

    installments.sort((left, right) => {
      const leftTime = left.dueDate ? new Date(left.dueDate).getTime() : 0;
      const rightTime = right.dueDate ? new Date(right.dueDate).getTime() : 0;
      return leftTime - rightTime;
    });

    return {
      lenderId,
      loan: {
        id: loan.id,
        borrowerId: loan.borrowerId,
        status: loan.status,
        amount: loan.amount,
        remainingAmount: loan.remainingAmount,
        interestRate: loan.interestRate,
        tenureMonths: loan.tenureMonths,
        createdAt: loan.createdAt ? loan.createdAt.toISOString() : null,
      },
      installments,
    };
  }

  private async getBorrowerMap(
    borrowerIds: string[],
  ): Promise<Map<string, BorrowerProfile>> {
    if (borrowerIds.length === 0) {
      return new Map<string, BorrowerProfile>();
    }

    const db = this.firebaseService.getDb();
    const snapshots = await db.getAll(
      ...borrowerIds.map((borrowerId) =>
        db.collection('users').doc(borrowerId),
      ),
    );

    return new Map<string, BorrowerProfile>(
      snapshots.map((snapshot) => {
        const data = snapshot.data();

        return [
          snapshot.id,
          {
            fullName:
              data &&
              typeof data.fullName === 'string' &&
              data.fullName.trim().length > 0
                ? data.fullName
                : snapshot.id,
            email:
              data && typeof data.email === 'string' ? data.email : 'No email',
          } satisfies BorrowerProfile,
        ] as const;
      }),
    );
  }

  private async getInstallmentSummaries(loanIds: string[]) {
    const db = this.firebaseService.getDb();
    const results = await Promise.all(
      loanIds.map(async (loanId) => {
        const snapshot = await db
          .collection('loans')
          .doc(loanId)
          .collection('installments')
          .get();

        const installments = snapshot.docs.map((doc) =>
          this.mapInstallment(doc),
        );
        const nextDue = installments
          .filter(
            (installment) =>
              installment.dueDate &&
              !['paid', 'completed'].includes(installment.status),
          )
          .sort((left, right) => {
            const leftTime = left.dueDate
              ? left.dueDate.getTime()
              : Number.MAX_SAFE_INTEGER;
            const rightTime = right.dueDate
              ? right.dueDate.getTime()
              : Number.MAX_SAFE_INTEGER;
            return leftTime - rightTime;
          })[0];
        const latestInstallment = installments.slice().sort((left, right) => {
          const leftTime = left.dueDate ? left.dueDate.getTime() : 0;
          const rightTime = right.dueDate ? right.dueDate.getTime() : 0;
          return rightTime - leftTime;
        })[0];

        return [
          loanId,
          {
            totalInstallments: installments.length,
            paidInstallments: installments.filter((installment) =>
              ['paid', 'completed'].includes(installment.status),
            ).length,
            overdueInstallments: installments.filter(
              (installment) => installment.status === 'overdue',
            ).length,
            nextDueDate: nextDue?.dueDate
              ? nextDue.dueDate.toISOString()
              : null,
            latestInstallmentStatus: latestInstallment?.status ?? 'unknown',
          },
        ] as const;
      }),
    );

    return new Map(results);
  }

  private async mapLoan(
    db: Firestore,
    doc: QueryDocumentSnapshot<DocumentData>,
  ): Promise<LoanRecord> {
    const data = doc.data();

    return this.mapLoanSnapshot(db, doc.id, data);
  }

  private async mapLoanSnapshot(
    db: Firestore,
    id: string,
    data: DocumentData,
  ): Promise<LoanRecord> {
    return {
      id,
      borrowerId: typeof data.borrowerId === 'string' ? data.borrowerId : null,
      amount: this.toNumber(data.principalMinor) / 100,
      remainingAmount: this.toNumber(data.remainingBalanceMinor) / 100,
      interestRate: this.toNumber(data.annualInterestRate),
      tenureMonths: this.toNumber(data.tenureMonths),
      status: typeof data.status === 'string' ? data.status : 'unknown',
      createdAt: getLoanCreatedAt(data),
    };
  }

  private mapTransaction(
    doc: QueryDocumentSnapshot<DocumentData>,
  ): TransactionRecord {
    const data = doc.data();

    return {
      id: doc.id,
      loanId: typeof data.loanId === 'string' ? data.loanId : null,
      installmentId:
        typeof data.installmentId === 'string' ? data.installmentId : null,
      paymentId: typeof data.paymentId === 'string' ? data.paymentId : null,
      type: typeof data.type === 'string' ? data.type : 'unknown',
      status: typeof data.status === 'string' ? data.status : 'recorded',
      amount: this.toNumber(data.amountMinor) / 100,
      createdAt: this.toDate(data.createdAt),
      source: 'transaction',
      note: typeof data.note === 'string' ? data.note : null,
    };
  }

  private async getTopLevelRepaymentsByLoanIds(
    loanIds: Set<string>,
  ): Promise<TransactionRecord[]> {
    if (loanIds.size === 0) {
      return [];
    }

    const db = this.firebaseService.getDb();
    const loanIdChunks = chunkValues(Array.from(loanIds), 10);
    const snapshots = await Promise.all(
      loanIdChunks.map((loanIdChunk) => {
        const query = db
          .collection('transactions')
          .where('loanId', 'in', loanIdChunk);
        return query.get();
      }),
    );

    const transactions = snapshots
      .flatMap((snapshot) => snapshot.docs)
      .map((doc) => this.mapTransaction(doc))
      .filter((transaction) =>
        transaction.loanId ? loanIds.has(transaction.loanId) : false,
      )
      .filter((transaction) =>
        this.isRepaymentLike(transaction.type, transaction.status),
      )
      .sort((left, right) => {
        const leftTime = left.createdAt ? left.createdAt.getTime() : 0;
        const rightTime = right.createdAt ? right.createdAt.getTime() : 0;
        return rightTime - leftTime;
      });
    return transactions;
  }

  private mapInstallment(
    doc: QueryDocumentSnapshot<DocumentData>,
  ): InstallmentRecord {
    const data = doc.data();

    return this.mapInstallmentSnapshot(doc.id, data);
  }

  private mapInstallmentSnapshot(
    id: string,
    data: DocumentData,
  ): InstallmentRecord {
    const normalized = getNormalizedInstallment(data);
    return {
      id,
      status: normalized.status,
      dueDate: normalized.dueDate,
      amount: this.toNumber(data.amountDueMinor) / 100,
      paidAmount:
        normalized.status === 'paid'
          ? this.toNumber(data.amountDueMinor) / 100
          : 0,
    };
  }

  private toDate(value: unknown): Date | null {
    return readDate(value);
  }

  private toNumber(value: unknown): number {
    return readNumber(value);
  }

  private createEmptySummary(): PaymentsSummary {
    return {
      totalTransactions: 0,
      totalCollected: 0,
      loansWithActivity: 0,
      overdueInstallments: 0,
    };
  }

  private clamp(value: number, min: number, max: number): number {
    return Math.min(Math.max(value, min), max);
  }

  private resolveInstallmentStatus(
    dueDate: Date | null,
    installmentAmount: number,
    paidAmount: number,
  ): string {
    if (paidAmount >= installmentAmount && installmentAmount > 0) {
      return 'paid';
    }

    if (dueDate && dueDate.getTime() < Date.now()) {
      return 'overdue';
    }

    if (paidAmount > 0) {
      return 'partially_paid';
    }

    return 'pending';
  }

  private normalizeNote(value: string | null | undefined): string | null {
    if (typeof value !== 'string') {
      return null;
    }

    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : null;
  }

  private isRepaymentLike(type: string, status: string): boolean {
    const normalizedType = type.trim().toLowerCase();
    const normalizedStatus = status.trim().toLowerCase();
    const uncollectedStatuses = new Set([
      'pending',
      'pending_verification',
      'verification_pending',
      'receipt_required',
    ]);

    if (uncollectedStatuses.has(normalizedStatus)) {
      return false;
    }

    if (
      normalizedType.includes('repay') ||
      normalizedType.includes('payment') ||
      normalizedType === 'paid'
    ) {
      return true;
    }

    return ['paid', 'completed', 'success', 'successful'].includes(
      normalizedStatus,
    );
  }

  private matchesTransactionFilters(
    transaction: TransactionRecord,
    context: LenderLedgerContext,
    search: string | null,
  ): boolean {
    if (
      !transaction.loanId ||
      !context.loanIds.has(transaction.loanId) ||
      transaction.amount <= 0 ||
      !this.isRepaymentLike(transaction.type, transaction.status)
    ) {
      return false;
    }

    return this.matchesSearch(transaction, context, search);
  }

  private matchesSearch(
    transaction: TransactionRecord,
    context: LenderLedgerContext,
    search: string | null,
  ): boolean {
    const normalizedSearch = this.normalizeSearch(search);

    if (!normalizedSearch) {
      return true;
    }

    const loan = transaction.loanId
      ? context.loanMap.get(transaction.loanId)
      : undefined;
    const borrower = loan?.borrowerId
      ? context.borrowerMap.get(loan.borrowerId)
      : undefined;
    const values = [
      transaction.id,
      transaction.loanId,
      transaction.installmentId,
      transaction.type,
      transaction.status,
      loan?.status ?? null,
      borrower?.fullName ?? null,
      borrower?.email ?? null,
    ];

    return values.some(
      (value) =>
        typeof value === 'string' &&
        value.toLowerCase().includes(normalizedSearch),
    );
  }

  private normalizeSearch(value: string | null | undefined): string | null {
    if (typeof value !== 'string') {
      return null;
    }

    const trimmed = value.trim().toLowerCase();
    return trimmed.length > 0 ? trimmed : null;
  }

  private isSeedPaymentMethod(type: string): boolean {
    const normalizedType = type.trim().toLowerCase();
    return ['qr', 'receipt', 'manual'].includes(normalizedType);
  }

  private getCachedValue<T>(
    cache: Map<string, CachedValue<T>>,
    key: string,
  ): T | null {
    const entry = cache.get(key);

    if (!entry) {
      return null;
    }

    if (entry.expiresAt <= Date.now()) {
      cache.delete(key);
      return null;
    }

    return entry.value;
  }

  private setCachedValue<T>(
    cache: Map<string, CachedValue<T>>,
    key: string,
    value: T,
  ): void {
    cache.set(key, {
      value,
      expiresAt: Date.now() + this.cacheTtlMs,
    });
  }

  private invalidateLenderCaches(lenderId: string): void {
    this.lenderContextCache.delete(lenderId);
    this.summaryCache.delete(lenderId);
    Array.from(this.searchCountCache.keys()).forEach((key) => {
      if (key.startsWith(`${lenderId}:`)) {
        this.searchCountCache.delete(key);
      }
    });
  }

  private sum(values: number[]): number {
    return values.reduce((total, value) => total + value, 0);
  }

  private paginateTransactions(
    transactions: TransactionRecord[],
    pageSize: number,
    cursor?: string | null,
  ): TransactionRecord[] {
    const decodedCursor = decodeCursor(cursor);
    const startIndex = decodedCursor
      ? transactions.findIndex(
          (transaction) =>
            transaction.id === decodedCursor.id &&
            transaction.createdAt?.toISOString() ===
              decodedCursor.date.toISOString(),
        ) + 1
      : 0;
    const safeStartIndex = startIndex > 0 ? startIndex : 0;

    return transactions.slice(safeStartIndex, safeStartIndex + pageSize + 1);
  }

  private logFallback(label: string, message: string, error: unknown): void {
    const detail =
      error instanceof Error ? error.message : 'Unknown Firestore query error';
    this.logger.warn(`${message} [${label}] ${detail}`);
  }
}
