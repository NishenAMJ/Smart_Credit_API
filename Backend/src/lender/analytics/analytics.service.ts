import { Injectable } from '@nestjs/common';
import {
  DocumentData,
  Firestore,
  QueryDocumentSnapshot,
} from 'firebase-admin/firestore';
import { FirebaseService } from '../firebase/firebase.service';
import {
  buildPageInfo,
  chunkValues,
  decodeCursor,
  dedupeById,
  readDate,
  readNumber,
} from '../firebase/firestore-query.utils';
import {
  computeLoanRemainingAmount,
  getAdStatus,
  getLoanAmount,
  getLoanCreatedAt,
  getPaymentAmount,
  getPaymentCreatedAt,
  isActiveAd as isSeedActiveAd,
} from '../firebase/firestore-seed.utils';
import {
  AnalyticsDrilldownItem,
  AnalyticsDrilldownResponse,
  AnalyticsOverviewResponse,
  AnalyticsSummaryResponse,
  AnalyticsTrendPoint,
} from './analytics.types';

type SupportedRangeKey = '30d' | '90d' | '365d';
type SupportedDrilldownType =
  | 'total-lent'
  | 'total-collected'
  | 'active-loans'
  | 'active-ads'
  | 'requests-received'
  | 'accepted-requests'
  | 'overdue-loans'
  | 'defaulted-loans'
  | 'open-disputes';

type RangeConfig = {
  key: SupportedRangeKey;
  label: string;
  days: number;
};

type LoanRecord = {
  id: string;
  requestId: string | null;
  borrowerId: string | null;
  amount: number;
  interestRate: number;
  tenureMonths: number;
  remainingAmount: number;
  status: string;
  createdAt: Date | null;
};

type AdRecord = {
  id: string;
  status: string;
  expiresAt: Date | null;
};

type RequestRecord = {
  id: string;
  borrowerId: string | null;
  targetLenderId: string | null;
  adId: string | null;
  amount: number;
  tenureMonths: number;
  purpose: string | null;
  status: string;
  createdAt: Date | null;
};

type TransactionRecord = {
  loanId: string | null;
  type: string;
  amount: number;
  createdAt: Date | null;
};

type DisputeRecord = {
  id: string;
  loanId: string | null;
  type: string;
  status: string;
  createdAt: Date | null;
};

type AnalyticsSummaryContext = {
  loans: LoanRecord[];
  ads: AdRecord[];
  requests: RequestRecord[];
  transactions: TransactionRecord[];
  disputes: DisputeRecord[];
  borrowerScores: number[];
};

const RANGE_CONFIGS: Record<SupportedRangeKey, RangeConfig> = {
  '30d': { key: '30d', label: 'Last 30 days', days: 30 },
  '90d': { key: '90d', label: 'Last 90 days', days: 90 },
  '365d': { key: '365d', label: 'Last 12 months', days: 365 },
};

@Injectable()
export class AnalyticsService {
  constructor(private readonly firebaseService: FirebaseService) {}

  async getSummary(
    lenderId: string,
    rangeKey = '30d',
  ): Promise<AnalyticsSummaryResponse> {
    const range = this.resolveRange(rangeKey);
    const context = await this.loadSummaryContext(lenderId);

    return this.buildSummaryResponse(lenderId, range, context);
  }

  async getOverview(
    lenderId: string,
    rangeKey = '30d',
  ): Promise<AnalyticsOverviewResponse> {
    const range = this.resolveRange(rangeKey);
    const context = await this.loadSummaryContext(lenderId);
    const summaryResponse = await this.buildSummaryResponse(
      lenderId,
      range,
      context,
    );
    const rangeLoans = context.loans.filter((loan) =>
      this.isWithinRange(loan.createdAt, range),
    );
    const rangeTransactions = context.transactions.filter((transaction) =>
      this.isWithinRange(transaction.createdAt, range),
    );

    const response: AnalyticsOverviewResponse = {
      lenderId,
      range: summaryResponse.range,
      summary: summaryResponse.summary,
      trends: {
        lendingByMonth: this.buildMonthlySeries(
          range,
          rangeLoans,
          (loan) => loan.createdAt,
          (loan) => loan.amount,
        ),
        collectionByMonth: this.buildMonthlySeries(
          range,
          rangeTransactions.filter(
            (transaction) => transaction.type === 'repayment',
          ),
          (transaction) => transaction.createdAt,
          (transaction) => transaction.amount,
        ),
      },
      breakdowns: {
        loanStatus: this.buildLoanStatusBreakdown(context.loans),
      },
      performance: summaryResponse.performance,
      portfolio: summaryResponse.portfolio,
      risk: summaryResponse.risk,
      insights: this.buildInsights({
        summary: summaryResponse.summary,
        activeAds: summaryResponse.performance.activeAds,
        rangeRequestsCount: summaryResponse.performance.requestsReceived,
        conversionRate: summaryResponse.performance.requestToLoanConversionRate,
        overdueLoans: summaryResponse.risk.overdueLoans,
        defaultedLoans: summaryResponse.risk.defaultedLoans,
        openDisputes: summaryResponse.risk.openDisputes,
        averageBorrowerCreditScore:
          summaryResponse.risk.averageBorrowerCreditScore,
      }),
    };

    return response;
  }

  private async loadSummaryContext(
    lenderId: string,
  ): Promise<AnalyticsSummaryContext> {
    const db = this.firebaseService.getDb();
    const [loanSnapshot, adSnapshot] = await Promise.all([
      db.collection('loans').where('lenderId', '==', lenderId).get(),
      db.collection('ads').where('lenderId', '==', lenderId).get(),
    ]);

    const loans = await Promise.all(
      loanSnapshot.docs.map((doc) => this.mapLoan(db, doc)),
    );
    const ads = adSnapshot.docs.map((doc) => this.mapAd(doc));

    const loanIds = new Set(loans.map((loan) => loan.id));
    const adIds = new Set(ads.map((ad) => ad.id));
    const borrowerIds = Array.from(
      new Set(
        loans
          .filter((loan) => loan.status === 'active' && loan.borrowerId)
          .map((loan) => loan.borrowerId as string),
      ),
    );

    const [requests, transactions, disputes, borrowerScores] =
      await Promise.all([
        this.getRequestsForLender(db, lenderId, adIds),
        this.getTransactionsForLender(db, lenderId, loanIds),
        this.getDisputesForLender(db, lenderId, loanIds),
        borrowerIds.length > 0
          ? this.getBorrowerCreditScores(db, borrowerIds)
          : Promise.resolve([]),
      ]);

    return {
      loans,
      ads,
      requests,
      transactions,
      disputes,
      borrowerScores,
    };
  }

  private async buildSummaryResponse(
    lenderId: string,
    range: RangeConfig & { start: Date; end: Date },
    context: AnalyticsSummaryContext,
  ): Promise<AnalyticsSummaryResponse> {
    const rangeLoans = context.loans.filter((loan) =>
      this.isWithinRange(loan.createdAt, range),
    );
    const rangeTransactions = context.transactions.filter((transaction) =>
      this.isWithinRange(transaction.createdAt, range),
    );
    const rangeRequests = context.requests.filter((request) =>
      this.isWithinRange(request.createdAt, range),
    );
    const activeLoans = context.loans.filter(
      (loan) => loan.status === 'active',
    ).length;
    const completedLoans = context.loans.filter(
      (loan) => loan.status === 'completed',
    ).length;
    const defaultedLoans = context.loans.filter(
      (loan) => loan.status === 'defaulted',
    ).length;
    const closedLoanOutcomes = completedLoans + defaultedLoans;
    const convertedRequestIds = new Set(
      context.loans
        .map((loan) => loan.requestId)
        .filter((requestId): requestId is string => Boolean(requestId)),
    );
    const acceptedRequests = rangeRequests.filter((request) =>
      ['accepted', 'converted_to_loan'].includes(request.status),
    ).length;
    const convertedRequests = rangeRequests.filter((request) =>
      convertedRequestIds.has(request.id),
    ).length;
    const openDisputes = context.disputes.filter((dispute) =>
      ['open', 'under_review'].includes(dispute.status),
    ).length;
    const overdueLoans =
      context.loans.length > 0
        ? await this.countOverdueLoans(
            this.firebaseService.getDb(),
            lenderId,
            context.loans,
          )
        : 0;

    const summary = {
      totalLent: this.sum(rangeLoans.map((loan) => loan.amount)),
      totalCollected: this.sum(
        rangeTransactions
          .filter((transaction) => transaction.type === 'repayment')
          .map((transaction) => transaction.amount),
      ),
      activeLoans,
      repaymentSuccessRate:
        closedLoanOutcomes > 0 ? completedLoans / closedLoanOutcomes : 0,
    };

    return {
      lenderId,
      range: {
        key: range.key,
        label: range.label,
        startDate: range.start.toISOString(),
        endDate: range.end.toISOString(),
      },
      summary,
      performance: {
        activeAds: context.ads.filter((ad) => this.isActiveAd(ad, range.end))
          .length,
        requestsReceived: rangeRequests.length,
        acceptedRequests,
        requestToLoanConversionRate:
          rangeRequests.length > 0
            ? convertedRequests / rangeRequests.length
            : 0,
      },
      portfolio: {
        outstandingAmount: this.sum(
          context.loans.map((loan) => loan.remainingAmount),
        ),
        averageLoanSize:
          context.loans.length > 0
            ? summary.totalLent / Math.max(rangeLoans.length, 1)
            : 0,
        averageInterestRate:
          context.loans.length > 0
            ? this.sum(context.loans.map((loan) => loan.interestRate)) /
              context.loans.length
            : 0,
        averageTenureMonths:
          context.loans.length > 0
            ? this.sum(context.loans.map((loan) => loan.tenureMonths)) /
              context.loans.length
            : 0,
      },
      risk: {
        overdueLoans,
        defaultedLoans,
        openDisputes,
        averageBorrowerCreditScore:
          context.borrowerScores.length > 0
            ? this.sum(context.borrowerScores) / context.borrowerScores.length
            : null,
      },
    };
  }

  async getDrilldown(
    lenderId: string,
    type: string,
    rangeKey = '30d',
    pageSize = 30,
    cursor?: string | null,
  ): Promise<AnalyticsDrilldownResponse> {
    const range = this.resolveRange(rangeKey);
    const normalizedType = this.resolveDrilldownType(type);
    const context = await this.loadAnalyticsContext(lenderId);
    const rangeLoans = context.loans.filter((loan) =>
      this.isWithinRange(loan.createdAt, range),
    );
    const rangeTransactions = context.transactions.filter((transaction) =>
      this.isWithinRange(transaction.createdAt, range),
    );
    const rangeRequests = context.requests.filter((request) =>
      this.isWithinRange(request.createdAt, range),
    );
    const openDisputes = context.disputes.filter((dispute) =>
      ['open', 'under_review'].includes(dispute.status),
    );
    const activeAds = context.ads.filter((ad) =>
      this.isActiveAd(ad, range.end),
    );
    const overdueLoanIds = await this.findOverdueLoanIds(
      this.firebaseService.getDb(),
      lenderId,
      context.loans,
    );

    const base = {
      lenderId,
      range: {
        key: range.key,
        label: range.label,
        startDate: range.start.toISOString(),
        endDate: range.end.toISOString(),
      },
      type: normalizedType,
    };

    const safePageSize = Math.min(Math.max(pageSize, 10), 60);
    let response: Omit<AnalyticsDrilldownResponse, 'pageInfo'>;

    switch (normalizedType) {
      case 'total-lent':
        response = {
          ...base,
          title: 'Lent Loans',
          description: 'Loans created in the selected period.',
          items: this.buildLoanItems(
            rangeLoans,
            context.borrowerNameMap,
            'Amount',
            (loan) => this.formatCurrency(loan.amount),
          ),
        };
        break;
      case 'total-collected':
        response = {
          ...base,
          title: 'Repayment Collections',
          description:
            'Repayment transactions recorded in the selected period.',
          items: this.buildTransactionItems(
            rangeTransactions.filter(
              (transaction) => transaction.type === 'repayment',
            ),
            context.loanMap,
            context.borrowerNameMap,
          ),
        };
        break;
      case 'active-loans':
        response = {
          ...base,
          title: 'Active Loans',
          description: 'Loans that are currently active in the portfolio.',
          items: this.buildLoanItems(
            context.loans.filter((loan) => loan.status === 'active'),
            context.borrowerNameMap,
            'Remaining',
            (loan) => this.formatCurrency(loan.remainingAmount),
          ),
        };
        break;
      case 'active-ads':
        response = {
          ...base,
          title: 'Active Ads',
          description: 'Approved ads that are still active for this lender.',
          items: this.buildAdItems(activeAds),
        };
        break;
      case 'requests-received':
        response = {
          ...base,
          title: 'Requests Received',
          description:
            'Loan requests linked to the lender or one of the lender ads.',
          items: this.buildRequestItems(rangeRequests, context.borrowerNameMap),
        };
        break;
      case 'accepted-requests':
        response = {
          ...base,
          title: 'Accepted Requests',
          description: 'Requests that were accepted or converted into loans.',
          items: this.buildRequestItems(
            rangeRequests.filter((request) =>
              ['accepted', 'converted_to_loan'].includes(request.status),
            ),
            context.borrowerNameMap,
          ),
        };
        break;
      case 'overdue-loans':
        response = {
          ...base,
          title: 'Overdue Loans',
          description: 'Loans with at least one overdue installment.',
          items: this.buildLoanItems(
            context.loans.filter((loan) => overdueLoanIds.has(loan.id)),
            context.borrowerNameMap,
            'Remaining',
            (loan) => this.formatCurrency(loan.remainingAmount),
          ),
        };
        break;
      case 'defaulted-loans':
        response = {
          ...base,
          title: 'Defaulted Loans',
          description: 'Loans marked as defaulted in the lender portfolio.',
          items: this.buildLoanItems(
            context.loans.filter((loan) => loan.status === 'defaulted'),
            context.borrowerNameMap,
            'Amount',
            (loan) => this.formatCurrency(loan.amount),
          ),
        };
        break;
      case 'open-disputes':
        response = {
          ...base,
          title: 'Open Disputes',
          description:
            'Disputes still open or under review for lender-linked loans.',
          items: this.buildDisputeItems(
            openDisputes,
            context.loanMap,
            context.borrowerNameMap,
          ),
        };
        break;
    }

    const pagedItems = this.paginateItems(response.items, safePageSize, cursor);

    return {
      ...response,
      items: pagedItems.items,
      pageInfo: buildPageInfo(
        pagedItems.items.map((item) => ({
          ...item,
          cursorDate: item.date ? new Date(item.date) : null,
          cursorId: item.id,
        })),
        safePageSize,
        pagedItems.hasMore,
      ),
    };
  }

  private resolveRange(
    rangeKey: string,
  ): RangeConfig & { start: Date; end: Date } {
    const normalizedKey = (
      rangeKey in RANGE_CONFIGS ? rangeKey : '30d'
    ) as SupportedRangeKey;
    const config = RANGE_CONFIGS[normalizedKey];
    const end = new Date();
    const start = new Date(end);
    start.setHours(0, 0, 0, 0);
    start.setDate(start.getDate() - (config.days - 1));

    return {
      ...config,
      start,
      end,
    };
  }

  private isWithinRange(
    value: Date | null,
    range: { start: Date; end: Date },
  ): boolean {
    return value ? value >= range.start && value <= range.end : false;
  }

  private async mapLoan(
    db: Firestore,
    doc: QueryDocumentSnapshot<DocumentData>,
  ): Promise<LoanRecord> {
    const data = doc.data();

    return {
      id: doc.id,
      requestId: typeof data.requestId === 'string' ? data.requestId : null,
      borrowerId: typeof data.borrowerId === 'string' ? data.borrowerId : null,
      amount: getLoanAmount(data),
      interestRate: this.toNumber(data.interestRate),
      tenureMonths: this.toNumber(data.tenureMonths),
      remainingAmount: await computeLoanRemainingAmount(db, doc.id, data),
      status: typeof data.status === 'string' ? data.status : 'unknown',
      createdAt: getLoanCreatedAt(data),
    };
  }

  private mapAd(doc: QueryDocumentSnapshot<DocumentData>): AdRecord {
    const data = doc.data();

    return {
      id: doc.id,
      status: getAdStatus(data),
      expiresAt: this.toDate(data.expiresAt),
    };
  }

  private mapRequest(doc: QueryDocumentSnapshot<DocumentData>): RequestRecord {
    const data = doc.data();

    return {
      id: doc.id,
      borrowerId: typeof data.borrowerId === 'string' ? data.borrowerId : null,
      targetLenderId:
        typeof data.targetLenderId === 'string' ? data.targetLenderId : null,
      adId: typeof data.adId === 'string' ? data.adId : null,
      amount: this.toNumber(data.amount),
      tenureMonths: this.toNumber(data.tenureMonths),
      purpose: typeof data.purpose === 'string' ? data.purpose : null,
      status: typeof data.status === 'string' ? data.status : 'unknown',
      createdAt: this.toDate(data.createdAt),
    };
  }

  private mapTransaction(
    doc: QueryDocumentSnapshot<DocumentData>,
  ): TransactionRecord {
    const data = doc.data();

    return {
      loanId: typeof data.loanId === 'string' ? data.loanId : null,
      type: typeof data.type === 'string' ? data.type : 'unknown',
      amount: this.toNumber(data.amount),
      createdAt: this.toDate(data.createdAt),
    };
  }

  private mapDispute(doc: QueryDocumentSnapshot<DocumentData>): DisputeRecord {
    const data = doc.data();

    return {
      id: doc.id,
      loanId: typeof data.loanId === 'string' ? data.loanId : null,
      type: typeof data.type === 'string' ? data.type : 'other',
      status: typeof data.status === 'string' ? data.status : 'unknown',
      createdAt: this.toDate(data.createdAt),
    };
  }

  private resolveDrilldownType(type: string): SupportedDrilldownType {
    const normalized = type.trim() as SupportedDrilldownType;
    const supported: SupportedDrilldownType[] = [
      'total-lent',
      'total-collected',
      'active-loans',
      'active-ads',
      'requests-received',
      'accepted-requests',
      'overdue-loans',
      'defaulted-loans',
      'open-disputes',
    ];

    return supported.includes(normalized) ? normalized : 'active-loans';
  }

  private async loadAnalyticsContext(lenderId: string) {
    const db = this.firebaseService.getDb();
    const [loanSnapshot, adSnapshot] = await Promise.all([
      db.collection('loans').where('lenderId', '==', lenderId).get(),
      db.collection('ads').where('lenderId', '==', lenderId).get(),
    ]);

    const loans = await Promise.all(
      loanSnapshot.docs.map((doc) => this.mapLoan(db, doc)),
    );
    const ads = adSnapshot.docs.map((doc) => this.mapAd(doc));

    const loanIds = new Set(loans.map((loan) => loan.id));
    const adIds = new Set(ads.map((ad) => ad.id));
    const [scopedRequests, transactions, disputes] = await Promise.all([
      this.getRequestsForLender(db, lenderId, adIds),
      this.getTransactionsForLoanIds(db, loanIds),
      this.getDisputesForLoanIds(db, loanIds),
    ]);

    const borrowerIds = Array.from(
      new Set([
        ...loans
          .map((loan) => loan.borrowerId)
          .filter((borrowerId): borrowerId is string => Boolean(borrowerId)),
        ...scopedRequests
          .map((request) => request.borrowerId)
          .filter((borrowerId): borrowerId is string => Boolean(borrowerId)),
      ]),
    );
    const borrowerNameMap = await this.getBorrowerNameMap(db, borrowerIds);

    return {
      loans,
      ads,
      requests: scopedRequests,
      transactions,
      disputes,
      borrowerNameMap,
      loanMap: new Map(loans.map((loan) => [loan.id, loan])),
    };
  }

  private async getRequestsForLender(
    db: Firestore,
    lenderId: string,
    adIds: Set<string>,
  ): Promise<RequestRecord[]> {
    const scopedSnapshots = await Promise.all([
      db
        .collection('loanRequests')
        .where('targetLenderId', '==', lenderId)
        .get(),
      db
        .collection('loanRequests')
        .where('matchedLenderIds', 'array-contains', lenderId)
        .get(),
      ...chunkValues(Array.from(adIds), 10).map((adIdChunk) =>
        db.collection('loanRequests').where('adId', 'in', adIdChunk).get(),
      ),
    ]);

    return dedupeById(
      scopedSnapshots
        .flatMap((snapshot) => snapshot.docs)
        .map((doc) => this.mapRequest(doc)),
    );
  }

  private async countOverdueLoans(
    db: Firestore,
    lenderId: string,
    loans: LoanRecord[],
  ): Promise<number> {
    const overdueLoanIds = await this.findOverdueLoanIds(db, lenderId, loans);
    return overdueLoanIds.size;
  }

  private async findOverdueLoanIds(
    db: Firestore,
    lenderId: string,
    loans: LoanRecord[],
  ): Promise<Set<string>> {
    try {
      const snapshot = await db
        .collectionGroup('installments')
        .where('lenderId', '==', lenderId)
        .where('status', '==', 'overdue')
        .get();

      return new Set(
        snapshot.docs
          .map((doc) => doc.get('loanId'))
          .filter((loanId): loanId is string => typeof loanId === 'string'),
      );
    } catch {
      const overdueChecks = await Promise.all(
        loans.map(async (loan) => {
          const snapshot = await db
            .collection('loans')
            .doc(loan.id)
            .collection('installments')
            .where('status', '==', 'overdue')
            .limit(1)
            .get();

          return snapshot.empty ? null : loan.id;
        }),
      );

      return new Set(
        overdueChecks.filter((loanId): loanId is string => loanId !== null),
      );
    }
  }

  private async getTransactionsForLoanIds(
    db: Firestore,
    loanIds: Set<string>,
  ): Promise<TransactionRecord[]> {
    if (loanIds.size === 0) {
      return [];
    }

    const snapshots = await Promise.all(
      chunkValues(Array.from(loanIds), 10).map((loanIdChunk) =>
        db.collection('transactions').where('loanId', 'in', loanIdChunk).get(),
      ),
    );

    const topLevelTransactions = snapshots.flatMap((snapshot) =>
      snapshot.docs.map((doc) => this.mapTransaction(doc)),
    );

    if (topLevelTransactions.length > 0) {
      return topLevelTransactions;
    }

    return this.getNestedPaymentTransactions(db, Array.from(loanIds));
  }

  private async getTransactionsForLender(
    db: Firestore,
    lenderId: string,
    loanIds: Set<string>,
  ): Promise<TransactionRecord[]> {
    if (loanIds.size === 0) {
      return [];
    }

    try {
      const snapshot = await db
        .collection('transactions')
        .where('lenderId', '==', lenderId)
        .get();

      if (snapshot.size > 0) {
        return snapshot.docs.map((doc) => this.mapTransaction(doc));
      }
    } catch {}

    return this.getTransactionsForLoanIds(db, loanIds);
  }

  private async getDisputesForLoanIds(
    db: Firestore,
    loanIds: Set<string>,
  ): Promise<DisputeRecord[]> {
    if (loanIds.size === 0) {
      return [];
    }

    const snapshots = await Promise.all(
      chunkValues(Array.from(loanIds), 10).map((loanIdChunk) =>
        db.collection('disputes').where('loanId', 'in', loanIdChunk).get(),
      ),
    );

    return dedupeById(
      snapshots.flatMap((snapshot) =>
        snapshot.docs.map((doc) => this.mapDispute(doc)),
      ),
    );
  }

  private async getDisputesForLender(
    db: Firestore,
    lenderId: string,
    loanIds: Set<string>,
  ): Promise<DisputeRecord[]> {
    if (loanIds.size === 0) {
      return [];
    }

    try {
      const snapshot = await db
        .collection('disputes')
        .where('lenderId', '==', lenderId)
        .get();

      if (snapshot.size > 0) {
        return snapshot.docs.map((doc) => this.mapDispute(doc));
      }
    } catch {}

    return this.getDisputesForLoanIds(db, loanIds);
  }

  private async getBorrowerCreditScores(
    db: Firestore,
    borrowerIds: string[],
  ): Promise<number[]> {
    const snapshots = await db.getAll(
      ...borrowerIds.map((borrowerId) =>
        db.collection('users').doc(borrowerId),
      ),
    );

    return snapshots
      .map((snapshot) => {
        const data = snapshot.data();
        return data ? this.toNullableNumber(data.creditScore) : null;
      })
      .filter((score): score is number => score !== null);
  }

  private async getBorrowerNameMap(
    db: Firestore,
    borrowerIds: string[],
  ): Promise<Map<string, string>> {
    if (borrowerIds.length === 0) {
      return new Map<string, string>();
    }

    const snapshots = await db.getAll(
      ...borrowerIds.map((borrowerId) =>
        db.collection('users').doc(borrowerId),
      ),
    );

    return new Map(
      snapshots.map((snapshot) => {
        const data = snapshot.data();
        const fullName =
          data &&
          typeof data.fullName === 'string' &&
          data.fullName.trim().length > 0
            ? data.fullName
            : snapshot.id;

        return [snapshot.id, fullName];
      }),
    );
  }

  private buildMonthlySeries<T>(
    range: { start: Date; end: Date },
    items: T[],
    getDate: (item: T) => Date | null,
    getValue: (item: T) => number,
  ): AnalyticsTrendPoint[] {
    const buckets = new Map<string, number>();
    const cursor = new Date(
      range.start.getFullYear(),
      range.start.getMonth(),
      1,
    );
    const end = new Date(range.end.getFullYear(), range.end.getMonth(), 1);

    while (cursor <= end) {
      const key = this.toMonthKey(cursor);
      buckets.set(key, 0);
      cursor.setMonth(cursor.getMonth() + 1);
    }

    items.forEach((item) => {
      const date = getDate(item);

      if (!date) {
        return;
      }

      const key = this.toMonthKey(date);

      if (!buckets.has(key)) {
        return;
      }

      buckets.set(key, (buckets.get(key) ?? 0) + getValue(item));
    });

    return Array.from(buckets.entries()).map(([key, value]) => ({
      label: this.toMonthLabel(key),
      value,
    }));
  }

  private buildLoanStatusBreakdown(loans: LoanRecord[]) {
    const counts = new Map<string, number>();

    loans.forEach((loan) => {
      counts.set(loan.status, (counts.get(loan.status) ?? 0) + 1);
    });

    return Array.from(counts.entries())
      .map(([label, value]) => ({ label, value }))
      .sort((left, right) => right.value - left.value);
  }

  private buildInsights(input: {
    summary: AnalyticsOverviewResponse['summary'];
    activeAds: number;
    rangeRequestsCount: number;
    conversionRate: number;
    overdueLoans: number;
    defaultedLoans: number;
    openDisputes: number;
    averageBorrowerCreditScore: number | null;
  }): string[] {
    const insights: string[] = [];

    if (input.summary.totalLent === 0) {
      insights.push(
        'No new lending was recorded in the selected period, so growth is currently flat.',
      );
    } else {
      insights.push(
        `Lending volume reached LKR ${Math.round(input.summary.totalLent).toLocaleString()} in the selected period.`,
      );
    }

    if (input.activeAds === 0) {
      insights.push(
        'There are no active ads right now, which can slow new borrower acquisition.',
      );
    } else if (input.rangeRequestsCount === 0) {
      insights.push(
        'Active ads are live, but they are not yet generating request flow in the selected range.',
      );
    } else if (input.conversionRate >= 0.4) {
      insights.push(
        'Request-to-loan conversion is healthy, which suggests your offer quality is strong.',
      );
    } else {
      insights.push(
        'Request conversion is still modest, so ad wording and borrower targeting deserve review.',
      );
    }

    if (input.overdueLoans > 0 || input.defaultedLoans > 0) {
      insights.push(
        'Portfolio risk needs attention because overdue or defaulted loans are already present.',
      );
    } else {
      insights.push(
        'Portfolio risk looks controlled with no overdue or defaulted loan flags.',
      );
    }

    if (input.openDisputes > 0) {
      insights.push(
        `There are ${input.openDisputes} open dispute cases that may affect trust and repayment operations.`,
      );
    }

    if (
      input.averageBorrowerCreditScore !== null &&
      input.averageBorrowerCreditScore < 550
    ) {
      insights.push(
        'The active borrower pool leans lower-credit, so tighter screening may protect future collections.',
      );
    }

    return insights.slice(0, 5);
  }

  private isActiveAd(ad: AdRecord, now: Date): boolean {
    return isSeedActiveAd(
      {
        status: ad.status,
        expiresAt: ad.expiresAt,
      } as DocumentData,
      now,
    );
  }

  private buildLoanItems(
    loans: LoanRecord[],
    borrowerNameMap: Map<string, string>,
    metricLabel: string,
    getMetric: (loan: LoanRecord) => string,
  ): AnalyticsDrilldownItem[] {
    return loans
      .slice()
      .sort((left, right) => {
        const leftTime = left.createdAt ? left.createdAt.getTime() : 0;
        const rightTime = right.createdAt ? right.createdAt.getTime() : 0;
        return rightTime - leftTime;
      })
      .map((loan) => ({
        id: loan.id,
        title: borrowerNameMap.get(loan.borrowerId ?? '') ?? loan.id,
        subtitle: `Loan ${loan.id}`,
        status: loan.status,
        metric: `${metricLabel}: ${getMetric(loan)}`,
        secondaryMetric: `Tenure: ${loan.tenureMonths} months`,
        date: loan.createdAt ? loan.createdAt.toISOString() : null,
      }));
  }

  private buildTransactionItems(
    transactions: TransactionRecord[],
    loanMap: Map<string, LoanRecord>,
    borrowerNameMap: Map<string, string>,
  ): AnalyticsDrilldownItem[] {
    return transactions
      .slice()
      .sort((left, right) => {
        const leftTime = left.createdAt ? left.createdAt.getTime() : 0;
        const rightTime = right.createdAt ? right.createdAt.getTime() : 0;
        return rightTime - leftTime;
      })
      .map((transaction) => {
        const loan = transaction.loanId
          ? loanMap.get(transaction.loanId)
          : undefined;
        const borrowerName = loan?.borrowerId
          ? borrowerNameMap.get(loan.borrowerId)
          : null;

        return {
          id: `${transaction.loanId ?? 'unknown'}-${transaction.createdAt?.toISOString() ?? 'no-date'}`,
          title: borrowerName ?? `Loan ${transaction.loanId ?? 'Unknown'}`,
          subtitle: `Repayment for loan ${transaction.loanId ?? 'Unknown'}`,
          status: transaction.type,
          metric: `Collected: ${this.formatCurrency(transaction.amount)}`,
          secondaryMetric: loan
            ? `Remaining: ${this.formatCurrency(loan.remainingAmount)}`
            : null,
          date: transaction.createdAt
            ? transaction.createdAt.toISOString()
            : null,
        };
      });
  }

  private buildRequestItems(
    requests: RequestRecord[],
    borrowerNameMap: Map<string, string>,
  ): AnalyticsDrilldownItem[] {
    return requests
      .slice()
      .sort((left, right) => {
        const leftTime = left.createdAt ? left.createdAt.getTime() : 0;
        const rightTime = right.createdAt ? right.createdAt.getTime() : 0;
        return rightTime - leftTime;
      })
      .map((request) => ({
        id: request.id,
        title:
          borrowerNameMap.get(request.borrowerId ?? '') ??
          `Request ${request.id}`,
        subtitle: request.purpose
          ? `${request.purpose} request`
          : `Request ${request.id}`,
        status: request.status,
        metric: `Amount: ${this.formatCurrency(request.amount)}`,
        secondaryMetric: `Tenure: ${request.tenureMonths} months`,
        date: request.createdAt ? request.createdAt.toISOString() : null,
      }));
  }

  private buildAdItems(ads: AdRecord[]): AnalyticsDrilldownItem[] {
    return ads
      .slice()
      .sort((left, right) => {
        const leftTime = left.expiresAt ? left.expiresAt.getTime() : 0;
        const rightTime = right.expiresAt ? right.expiresAt.getTime() : 0;
        return rightTime - leftTime;
      })
      .map((ad) => ({
        id: ad.id,
        title: `Ad ${ad.id}`,
        subtitle: 'Lender ad performance',
        status: ad.status,
        metric: ad.expiresAt
          ? `Expires: ${this.formatDate(ad.expiresAt.toISOString())}`
          : 'No expiry date',
        secondaryMetric: null,
        date: ad.expiresAt ? ad.expiresAt.toISOString() : null,
      }));
  }

  private buildDisputeItems(
    disputes: DisputeRecord[],
    loanMap: Map<string, LoanRecord>,
    borrowerNameMap: Map<string, string>,
  ): AnalyticsDrilldownItem[] {
    return disputes
      .slice()
      .sort((left, right) => {
        const leftTime = left.createdAt ? left.createdAt.getTime() : 0;
        const rightTime = right.createdAt ? right.createdAt.getTime() : 0;
        return rightTime - leftTime;
      })
      .map((dispute) => {
        const loan = dispute.loanId ? loanMap.get(dispute.loanId) : undefined;
        const borrowerName = loan?.borrowerId
          ? borrowerNameMap.get(loan.borrowerId)
          : null;

        return {
          id: dispute.id,
          title: borrowerName ?? `Dispute ${dispute.id}`,
          subtitle: dispute.loanId
            ? `Loan ${dispute.loanId}`
            : `Dispute ${dispute.id}`,
          status: dispute.status,
          metric: `Type: ${this.formatStatus(dispute.type)}`,
          secondaryMetric: null,
          date: dispute.createdAt ? dispute.createdAt.toISOString() : null,
        };
      });
  }

  private formatCurrency(value: number): string {
    return new Intl.NumberFormat('en-LK', {
      style: 'currency',
      currency: 'LKR',
      maximumFractionDigits: 0,
    }).format(value);
  }

  private formatDate(value: string): string {
    return new Intl.DateTimeFormat('en-LK', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    }).format(new Date(value));
  }

  private formatStatus(value: string): string {
    return value
      .replace(/_/g, ' ')
      .replace(/\b\w/g, (character) => character.toUpperCase());
  }

  private toMonthKey(value: Date): string {
    const month = String(value.getMonth() + 1).padStart(2, '0');
    return `${value.getFullYear()}-${month}`;
  }

  private toMonthLabel(value: string): string {
    const [year, month] = value.split('-').map(Number);
    return new Intl.DateTimeFormat('en-LK', {
      month: 'short',
      year: '2-digit',
    }).format(new Date(year, month - 1, 1));
  }

  private toDate(value: unknown): Date | null {
    return readDate(value);
  }

  private toNumber(value: unknown): number {
    return readNumber(value);
  }

  private toNullableNumber(value: unknown): number | null {
    const parsed = this.toNumber(value);
    return parsed === 0 && value !== 0 && value !== '0' ? null : parsed;
  }

  private sum(values: number[]): number {
    return values.reduce((total, value) => total + value, 0);
  }

  private async getNestedPaymentTransactions(
    db: Firestore,
    loanIds: string[],
  ): Promise<TransactionRecord[]> {
    const groups = await Promise.all(
      loanIds.map(async (loanId) => {
        const installmentsSnapshot = await db
          .collection('loans')
          .doc(loanId)
          .collection('installments')
          .get();

        const paymentGroups = await Promise.all(
          installmentsSnapshot.docs.map(async (installmentDoc) => {
            const paymentsSnapshot = await installmentDoc.ref
              .collection('payments')
              .get();

            return paymentsSnapshot.docs.map((paymentDoc) => {
              const data = paymentDoc.data();
              return {
                loanId,
                type:
                  typeof data.type === 'string'
                    ? data.type
                    : typeof data.paymentType === 'string'
                      ? data.paymentType
                      : 'repayment',
                amount: getPaymentAmount(data),
                createdAt: getPaymentCreatedAt(data),
              } satisfies TransactionRecord;
            });
          }),
        );

        return paymentGroups.flat();
      }),
    );

    return groups.flat();
  }

  private paginateItems<T extends { id: string; date: string | null }>(
    items: T[],
    pageSize: number,
    cursor?: string | null,
  ): { items: T[]; hasMore: boolean } {
    const decoded = decodeCursor(cursor);
    const startIndex = decoded
      ? items.findIndex(
          (item) =>
            item.id === decoded.id &&
            (item.date ? new Date(item.date).toISOString() : null) ===
              decoded.date.toISOString(),
        ) + 1
      : 0;
    const safeStartIndex = startIndex > 0 ? startIndex : 0;
    const sliced = items.slice(safeStartIndex, safeStartIndex + pageSize + 1);

    return {
      items: sliced.slice(0, pageSize),
      hasMore: sliced.length > pageSize,
    };
  }
}
