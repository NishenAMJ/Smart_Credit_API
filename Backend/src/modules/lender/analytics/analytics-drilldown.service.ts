import { Injectable } from '@nestjs/common';
import { DocumentData } from 'firebase-admin/firestore';
import {
  buildPageInfo,
  decodeCursor,
} from '../../../firebase/firestore-query.utils';
import { isActiveAd as isSeedActiveAd } from '../../../firebase/firestore-seed.utils';
import { AnalyticsDataService } from './analytics-data.service';
import type {
  AdRecord,
  DisputeRecord,
  LoanRecord,
  RequestRecord,
  TransactionRecord,
} from './analytics.models';
import {
  AnalyticsDrilldownItem,
  AnalyticsDrilldownResponse,
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

const RANGE_CONFIGS: Record<SupportedRangeKey, RangeConfig> = {
  '30d': { key: '30d', label: 'Last 30 days', days: 30 },
  '90d': { key: '90d', label: 'Last 90 days', days: 90 },
  '365d': { key: '365d', label: 'Last 12 months', days: 365 },
};

@Injectable()
export class AnalyticsDrilldownService {
  constructor(private readonly analyticsData: AnalyticsDataService) {}

  async getDrilldown(
    lenderId: string,
    type: string,
    rangeKey = '90d',
    pageSize = 30,
    cursor?: string | null,
  ): Promise<AnalyticsDrilldownResponse> {
    const range = this.resolveRange(rangeKey);
    const normalizedType = this.resolveDrilldownType(type);
    const context = await this.analyticsData.loadAnalyticsContext(lenderId);
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
    const overdueLoanIds = await this.analyticsData.findOverdueLoanIds(
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
      rangeKey in RANGE_CONFIGS ? rangeKey : '90d'
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
        title: ad.title,
        subtitle: `Ad ID: ${ad.id}`,
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
