import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import {
  DocumentData,
  FieldValue,
  Firestore,
  QueryDocumentSnapshot,
  Timestamp,
} from 'firebase-admin/firestore';
import { FirebaseService } from '../../../firebase/firebase.service';
import {
  applyDateCursor,
  buildPageInfo,
  chunkValues,
  decodeCursor,
  orderByDateAndId,
  readDate,
  readNumber,
} from '../../../firebase/firestore-query.utils';
import {
  computeLoanRemainingAmount,
  getInstallmentAmount,
  getNormalizedInstallment,
  getPaymentAmount,
  getPaymentAncestorData,
  getPaymentCreatedAt,
  getLoanAmount,
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

      if (input.amount > installmentOutstanding) {
        throw new BadRequestException(
          `Payment exceeds installment outstanding balance of ${installmentOutstanding}.`,
        );
      }

      const nextPaidAmount = currentPaidAmount + input.amount;
      const installmentStatus = this.resolveInstallmentStatus(
        installment.dueDate,
        installment.amount,
        nextPaidAmount,
      );
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
      const paymentRef = installmentRef.collection('payments').doc();
      const transactionRef = db.collection('transactions').doc();
      const paymentTimestamp = Timestamp.fromDate(parsedPaidAt);
      const note = this.normalizeNote(input.note);

      transaction.set(paymentRef, {
        paymentId: paymentRef.id,
        lenderId,
        borrowerId: loan.borrowerId,
        loanId,
        installmentId,
        amount: input.amount,
        paidAmount: input.amount,
        paidAt: paymentTimestamp,
        createdAt: paymentTimestamp,
        updatedAt: FieldValue.serverTimestamp(),
        type: 'repayment',
        paymentType: 'repayment',
        status: 'completed',
        note,
        recordedByLenderId: lenderId,
      });

      transaction.set(transactionRef, {
        paymentId: paymentRef.id,
        loanId,
        installmentId,
        amount: input.amount,
        createdAt: paymentTimestamp,
        updatedAt: FieldValue.serverTimestamp(),
        type: 'repayment',
        status: 'completed',
        note,
        lenderId,
        borrowerId: loan.borrowerId,
      });

      transaction.update(installmentRef, {
        lenderId,
        borrowerId: loan.borrowerId,
        loanId,
        installmentId,
        paidAmount: nextPaidAmount,
        amountPaid: nextPaidAmount,
        amountDue: installment.amount,
        status: installmentStatus,
        lastPaymentAt: paymentTimestamp,
        updatedAt: FieldValue.serverTimestamp(),
      });

      transaction.update(loanRef, {
        remainingAmount: nextRemainingAmount,
        status: loanStatus,
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
    const db = this.firebaseService.getDb();
    let usedCollectionGroup = false;

    try {
      const items: TransactionRecord[] = [];
      let currentCursor = cursor ?? null;
      let exhausted = false;

      while (items.length < pageSize + 1 && !exhausted) {
        const snapshot = await applyDateCursor(
          orderByDateAndId(
            db
              .collectionGroup('payments')
              .where('lenderId', '==', context.lenderId),
            'paidAt',
          ),
          currentCursor,
        )
          .limit(Math.max(pageSize * 2, 40))
          .get();
        usedCollectionGroup = true;

        if (snapshot.empty) {
          exhausted = true;
          break;
        }

        snapshot.docs.forEach((paymentDoc) => {
          if (items.length >= pageSize + 1) {
            return;
          }

          const payment = this.mapPayment(paymentDoc);

          if (
            this.matchesTransactionFilters(payment, context, search ?? null)
          ) {
            items.push(payment);
          }
        });

        const lastDoc = snapshot.docs[snapshot.docs.length - 1];
        currentCursor =
          snapshot.docs.length > 0
            ? Buffer.from(
                JSON.stringify({
                  timestamp:
                    readDate(lastDoc.get('paidAt'))?.toISOString() ??
                    new Date(0).toISOString(),
                  id: lastDoc.id,
                }),
                'utf8',
              ).toString('base64url')
            : null;
        exhausted = snapshot.docs.length < Math.max(pageSize * 2, 40);
      }

      if (items.length > 0 || usedCollectionGroup) {
        return { items };
      }
    } catch (error) {
      this.logFallback(
        'recent-payments:collection-group',
        'Falling back from lender-scoped payments collection group query.',
        error,
      );
    }

    const topLevelTransactions = this.paginateTransactions(
      (await this.getTopLevelRepaymentsByLoanIds(context.loanIds)).filter(
        (transaction) =>
          this.matchesTransactionFilters(transaction, context, search ?? null),
      ),
      pageSize,
      cursor,
    );

    if (topLevelTransactions.length > 0) {
      this.logger.warn(
        'Using degraded top-level transactions fallback for recent payments page.',
      );
      return { items: topLevelTransactions };
    }

    this.logger.warn(
      'Using degraded traversed nested-payments fallback for recent payments page.',
    );
    return {
      items: await this.getTraversedPaymentsByLoanIds(
        context.loanIdsList,
        pageSize,
        cursor,
        search,
        context,
      ),
    };
  }

  private async getAllRecentPayments(
    lenderId: string,
    loanIds: Set<string>,
  ): Promise<TransactionRecord[]> {
    const db = this.firebaseService.getDb();

    try {
      const snapshot = await db
        .collectionGroup('payments')
        .where('lenderId', '==', lenderId)
        .orderBy('paidAt', 'desc')
        .get();

      const payments = snapshot.docs
        .map((paymentDoc) => this.mapPayment(paymentDoc))
        .filter(
          (payment) =>
            payment.loanId &&
            loanIds.has(payment.loanId) &&
            payment.amount > 0 &&
            this.isRepaymentLike(payment.type, payment.status),
        );

      if (payments.length > 0) {
        return payments;
      }
    } catch (error) {
      this.logFallback(
        'recent-payments:full-collection-group',
        'Falling back from full lender-scoped payments history query.',
        error,
      );
    }

    const topLevel = await this.getTopLevelRepaymentsByLoanIds(loanIds);

    if (topLevel.length > 0) {
      return topLevel;
    }

    return this.getTraversedPaymentsByLoanIds(Array.from(loanIds));
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
    const topLevelTransactions = await this.getTopLevelRepaymentsByLoanIds(
      new Set([loanId]),
    );

    const installments = await Promise.all(
      installmentsSnapshot.docs.map(async (installmentDoc) => {
        const installment = this.mapInstallment(installmentDoc);
        const paymentsSnapshot = await installmentDoc.ref
          .collection('payments')
          .get();
        const payments = paymentsSnapshot.docs
          .map((paymentDoc) => this.mapPayment(paymentDoc))
          .filter((payment) => payment.amount > 0);

        const fallbackTransactions = topLevelTransactions.filter(
          (transaction) =>
            transaction.installmentId === installmentDoc.id &&
            !transaction.paymentId,
        );

        const mergedPayments = [...payments, ...fallbackTransactions].sort(
          (left, right) => {
            const leftTime = left.createdAt ? left.createdAt.getTime() : 0;
            const rightTime = right.createdAt ? right.createdAt.getTime() : 0;
            return rightTime - leftTime;
          },
        );

        return {
          id: installment.id,
          status: installment.status,
          dueDate: installment.dueDate
            ? installment.dueDate.toISOString()
            : null,
          amount: installment.amount,
          paidAmount:
            installment.paidAmount > 0
              ? installment.paidAmount
              : this.sum(mergedPayments.map((payment) => payment.amount)),
          payments: mergedPayments.map((payment) => ({
            id: payment.id,
            amount: payment.amount,
            status: payment.status,
            type: payment.type,
            createdAt: payment.createdAt
              ? payment.createdAt.toISOString()
              : null,
            source: payment.source,
            note: payment.note,
          })),
        };
      }),
    );

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
      amount: getLoanAmount(data),
      remainingAmount: await computeLoanRemainingAmount(db, id, data),
      interestRate: this.toNumber(data.interestRate),
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
      amount: this.toNumber(data.amount),
      createdAt: this.toDate(data.createdAt),
      source: 'transaction',
      note: typeof data.note === 'string' ? data.note : null,
    };
  }

  private async getNestedPayments(
    loanIds: string[],
  ): Promise<TransactionRecord[]> {
    if (loanIds.length === 0) {
      return [];
    }

    const db = this.firebaseService.getDb();
    const loanIdChunks = chunkValues(loanIds, 10);
    const paymentGroups = await Promise.all(
      loanIdChunks.map(async (loanIdChunk) => {
        const snapshot = await db
          .collectionGroup('payments')
          .where('loanId', 'in', loanIdChunk)
          .get();

        return snapshot.docs.map((paymentDoc) => {
          return this.mapPayment(paymentDoc);
        });
      }),
    );

    return paymentGroups
      .flat()
      .filter((payment) => payment.loanId && loanIds.includes(payment.loanId))
      .filter((payment) => payment.amount > 0)
      .filter((payment) => this.isRepaymentLike(payment.type, payment.status))
      .sort((left, right) => {
        const leftTime = left.createdAt ? left.createdAt.getTime() : 0;
        const rightTime = right.createdAt ? right.createdAt.getTime() : 0;
        return rightTime - leftTime;
      });
  }

  private async getTopLevelRepayments(
    loanIds: Set<string>,
  ): Promise<TransactionRecord[]> {
    return this.getTopLevelRepaymentsByLoanIds(loanIds);
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

  private async getTraversedPaymentsByLoanIds(
    loanIds: string[],
    pageSize?: number,
    cursor?: string | null,
    search?: string | null,
    context?: LenderLedgerContext,
  ): Promise<TransactionRecord[]> {
    if (loanIds.length === 0) {
      return [];
    }

    const db = this.firebaseService.getDb();
    const paymentGroups = await Promise.all(
      loanIds.map(async (loanId) => {
        const installmentsSnapshot = await db
          .collection('loans')
          .doc(loanId)
          .collection('installments')
          .get();

        const installmentPayments = await Promise.all(
          installmentsSnapshot.docs.map(async (installmentDoc) => {
            const paymentsSnapshot = await installmentDoc.ref
              .collection('payments')
              .get();
            return paymentsSnapshot.docs.map((paymentDoc) =>
              this.mapPayment(paymentDoc),
            );
          }),
        );

        return installmentPayments.flat();
      }),
    );

    const allPayments = paymentGroups
      .flat()
      .filter((payment) => payment.loanId && loanIds.includes(payment.loanId))
      .filter((payment) => payment.amount > 0)
      .filter((payment) => this.isRepaymentLike(payment.type, payment.status))
      .filter((payment) =>
        context ? this.matchesSearch(payment, context, search ?? null) : true,
      )
      .sort((left, right) => {
        const leftTime = left.createdAt ? left.createdAt.getTime() : 0;
        const rightTime = right.createdAt ? right.createdAt.getTime() : 0;
        return rightTime - leftTime;
      });

    if (!pageSize) {
      return allPayments;
    }

    const decodedCursor = decodeCursor(cursor);
    const startIndex = decodedCursor
      ? allPayments.findIndex(
          (payment) =>
            payment.id === decodedCursor.id &&
            payment.createdAt?.toISOString() ===
              decodedCursor.date.toISOString(),
        ) + 1
      : 0;
    const safeStartIndex = startIndex > 0 ? startIndex : 0;

    return allPayments.slice(safeStartIndex, safeStartIndex + pageSize + 1);
  }

  private mapPayment(
    doc: QueryDocumentSnapshot<DocumentData>,
  ): TransactionRecord {
    const data = doc.data();
    const ancestors = getPaymentAncestorData(doc);
    const rawType =
      typeof data.type === 'string'
        ? data.type
        : typeof data.paymentType === 'string'
          ? data.paymentType
          : 'payment';
    const normalizedType = this.isSeedPaymentMethod(rawType)
      ? 'repayment'
      : rawType;

    return {
      id: doc.id,
      loanId: ancestors.loanId,
      installmentId: ancestors.installmentId,
      paymentId: doc.id,
      type: normalizedType,
      status: typeof data.status === 'string' ? data.status : 'recorded',
      amount: getPaymentAmount(data),
      createdAt: getPaymentCreatedAt(data),
      source: 'payment',
      note: typeof data.note === 'string' ? data.note : null,
    };
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
      amount: getInstallmentAmount(data),
      paidAmount: this.toNumber(data.paidAmount ?? data.amountPaid),
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
