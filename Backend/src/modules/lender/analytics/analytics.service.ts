import { Injectable } from '@nestjs/common';
import { AnalyticsDataService } from './analytics-data.service';
import { AnalyticsDrilldownService } from './analytics-drilldown.service';
import type {
  AdRecord,
  AnalyticsSummaryContext,
  LoanRecord,
} from './analytics.models';
import { isActiveAd as isSeedActiveAd } from '../../../firebase/firestore-seed.utils';
import {
  AnalyticsDrilldownResponse,
  AnalyticsOverviewResponse,
  AnalyticsSummaryResponse,
  AnalyticsTrendPoint,
} from './analytics.types';

type SupportedRangeKey = '30d' | '90d' | '365d';
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
export class AnalyticsService {
  constructor(
    private readonly analyticsData: AnalyticsDataService,
    private readonly drilldownService: AnalyticsDrilldownService,
  ) {}

  async getSummary(
    lenderId: string,
    rangeKey = '90d',
  ): Promise<AnalyticsSummaryResponse> {
    const range = this.resolveRange(rangeKey);
    const context = await this.analyticsData.loadSummaryContext(lenderId);

    return this.buildSummaryResponse(lenderId, range, context);
  }

  async getOverview(
    lenderId: string,
    rangeKey = '90d',
  ): Promise<AnalyticsOverviewResponse> {
    const range = this.resolveRange(rangeKey);
    const context = await this.analyticsData.loadSummaryContext(lenderId);
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
        ? await this.analyticsData.countOverdueLoans(lenderId, context.loans)
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

  getDrilldown(
    lenderId: string,
    type: string,
    rangeKey = '90d',
    pageSize = 30,
    cursor?: string | null,
  ): Promise<AnalyticsDrilldownResponse> {
    return this.drilldownService.getDrilldown(
      lenderId,
      type,
      rangeKey,
      pageSize,
      cursor,
    );
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
      },
      now,
    );
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

  private sum(values: number[]): number {
    return values.reduce((total, value) => total + value, 0);
  }
}
