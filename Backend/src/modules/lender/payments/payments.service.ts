import { Injectable, Logger } from '@nestjs/common';
import { PaymentsDataService } from './payments-data.service';
import type { LenderLedgerContext, TransactionRecord } from './payments.models';
import {
  buildPageInfo,
  decodeCursor,
} from '../../../firebase/firestore-query.utils';
import {
  PaymentListItem,
  PaymentActivityFilter,
  PaymentsResponse,
  PaymentsSummary,
} from './payments.types';
import type { LenderDateRange } from '../shared/lender-date-range';
import {
  isWithinLenderDateRange,
  parseOptionalSriLankaDayRange,
} from '../shared/lender-date-range';
import { isCollectedRepayment } from './payment-transaction.utils';

type CachedValue<T> = {
  expiresAt: number;
  value: T;
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

  constructor(private readonly paymentsData: PaymentsDataService) {}

  async getPayments(
    lenderId: string,
    pageSize = 30,
    cursor?: string | null,
    includeSummary = true,
    includeSearchCount = true,
    search?: string | null,
    date?: string | null,
    activity: PaymentActivityFilter = 'all',
  ): Promise<PaymentsResponse> {
    const safePageSize = this.clamp(pageSize, 8, 60);
    const normalizedSearch = this.normalizeSearch(search);
    const collectionDate = parseOptionalSriLankaDayRange(date);
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
      collectionDate,
      activity,
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
      ? await this.getSummaryForLender(
          lenderId,
          loanIds,
          loanIdsList,
          collectionDate,
          activity,
        )
      : this.createEmptySummary();
    const searchResultCount =
      normalizedSearch && includeSearchCount
        ? await this.getSearchResultCount(
            lenderId,
            context,
            normalizedSearch,
            collectionDate,
            activity,
          )
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

  private async getLenderContext(
    lenderId: string,
  ): Promise<LenderLedgerContext> {
    const cached = this.getCachedValue(this.lenderContextCache, lenderId);
    if (cached) return cached;

    const context = await this.paymentsData.loadLenderContext(lenderId);
    this.setCachedValue(this.lenderContextCache, lenderId, context);
    return context;
  }

  private async getSummaryForLender(
    lenderId: string,
    loanIds: Set<string>,
    loanIdsList: string[],
    collectionDate: LenderDateRange | null,
    activity: PaymentActivityFilter,
  ): Promise<PaymentsSummary> {
    const summaryCacheKey = `${lenderId}:${activity}`;
    const cached = collectionDate
      ? null
      : this.getCachedValue(this.summaryCache, summaryCacheKey);

    if (cached) {
      return cached;
    }

    const allScopedTransactions = (
      await this.getAllRecentPayments(lenderId, loanIds, activity)
    ).filter((transaction) =>
      isWithinLenderDateRange(transaction.createdAt, collectionDate),
    );
    const installmentSummaries = collectionDate
      ? new Map<
          string,
          {
            totalInstallments: number;
            paidInstallments: number;
            overdueInstallments: number;
            nextDueDate: string | null;
            latestInstallmentStatus: string;
          }
        >()
      : await this.getInstallmentSummaries(loanIdsList);
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

    if (!collectionDate) {
      this.setCachedValue(this.summaryCache, summaryCacheKey, summary);
    }

    return summary;
  }

  private async getSearchResultCount(
    lenderId: string,
    context: LenderLedgerContext,
    search: string,
    collectionDate: LenderDateRange | null,
    activity: PaymentActivityFilter,
  ): Promise<number> {
    const cacheKey = `${lenderId}:${activity}:${collectionDate?.value ?? 'all'}:${search}`;
    const cached = this.getCachedValue(this.searchCountCache, cacheKey);

    if (cached !== null) {
      return cached;
    }

    const allScopedTransactions = await this.getAllRecentPayments(
      lenderId,
      context.loanIds,
      activity,
    );
    const count = allScopedTransactions.filter(
      (transaction) =>
        isWithinLenderDateRange(transaction.createdAt, collectionDate) &&
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
    collectionDate: LenderDateRange | null = null,
    activity: PaymentActivityFilter = 'all',
  ): Promise<{ items: TransactionRecord[] }> {
    const items = this.paginateTransactions(
      (
        await this.getTopLevelActivityByLoanIds(context.loanIds, activity)
      ).filter((transaction) =>
        this.matchesTransactionFilters(
          transaction,
          context,
          search ?? null,
          collectionDate,
        ),
      ),
      pageSize,
      cursor,
    );

    return { items };
  }

  private async getAllRecentPayments(
    _lenderId: string,
    loanIds: Set<string>,
    activity: PaymentActivityFilter,
  ): Promise<TransactionRecord[]> {
    return this.getTopLevelActivityByLoanIds(loanIds, activity);
  }

  private async getRecentPaymentsForLender(
    lenderId: string,
    limit: number,
  ): Promise<TransactionRecord[] | null> {
    const context = await this.getLenderContext(lenderId);

    if (context.loanIds.size === 0) {
      return [];
    }

    return (
      await this.getRecentPaymentsPage(
        context,
        limit,
        null,
        null,
        null,
        'payment',
      )
    ).items.slice(0, limit);
  }

  private async getInstallmentSummaries(loanIds: string[]) {
    return this.paymentsData.getInstallmentSummaries(loanIds);
  }

  private async getTopLevelActivityByLoanIds(
    loanIds: Set<string>,
    activity: PaymentActivityFilter,
  ): Promise<TransactionRecord[]> {
    return (
      await this.paymentsData.getTransactions(
        loanIds,
        activity === 'payment'
          ? ['repayment']
          : activity === 'disbursement'
            ? ['disbursement']
            : ['repayment', 'disbursement'],
      )
    ).filter((transaction) =>
      isCollectedRepayment(transaction.type, transaction.status),
    );
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

  private matchesTransactionFilters(
    transaction: TransactionRecord,
    context: LenderLedgerContext,
    search: string | null,
    collectionDate: LenderDateRange | null,
  ): boolean {
    if (
      !transaction.loanId ||
      !context.loanIds.has(transaction.loanId) ||
      transaction.amount <= 0 ||
      !isCollectedRepayment(transaction.type, transaction.status) ||
      !isWithinLenderDateRange(transaction.createdAt, collectionDate)
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

  invalidateLenderCache(lenderId: string): void {
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
