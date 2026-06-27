// Analytics API contracts used by the lender overview and drilldown screens.
import { fetchLenderApiWithQuery } from "./api-client";

export type AnalyticsRange = {
  key: string;
  label: string;
  startDate: string;
  endDate: string;
};

export type AnalyticsSummary = {
  totalLent: number;
  totalCollected: number;
  activeLoans: number;
  repaymentSuccessRate: number;
};

export type AnalyticsTrendPoint = {
  label: string;
  value: number;
};

export type AnalyticsBreakdownPoint = {
  label: string;
  value: number;
};

export type AnalyticsOverviewResponse = {
  lenderId: string;
  range: AnalyticsRange;
  summary: AnalyticsSummary;
  trends: {
    lendingByMonth: AnalyticsTrendPoint[];
    collectionByMonth: AnalyticsTrendPoint[];
  };
  breakdowns: {
    loanStatus: AnalyticsBreakdownPoint[];
  };
  performance: {
    activeAds: number;
    requestsReceived: number;
    acceptedRequests: number;
    requestToLoanConversionRate: number;
  };
  portfolio: {
    outstandingAmount: number;
    averageLoanSize: number;
    averageInterestRate: number;
    averageTenureMonths: number;
  };
  risk: {
    overdueLoans: number;
    defaultedLoans: number;
    openDisputes: number;
    averageBorrowerCreditScore: number | null;
  };
  insights: string[];
};

export type AnalyticsDrilldownItem = {
  id: string;
  title: string;
  subtitle: string;
  status: string;
  metric: string;
  secondaryMetric: string | null;
  date: string | null;
};

export type AnalyticsDrilldownResponse = {
  lenderId: string;
  range: AnalyticsRange;
  type: string;
  title: string;
  description: string;
  items: AnalyticsDrilldownItem[];
  pageInfo: {
    pageSize: number;
    hasMore: boolean;
    nextCursor: string | null;
  };
};

export async function fetchAnalyticsOverview(
  range: string,
): Promise<AnalyticsOverviewResponse> {
  // Fetches the summary payload that drives the top-level analytics dashboard cards and charts.
  const response = await fetchLenderApiWithQuery(
    "/analytics/overview",
    new URLSearchParams({
      range,
    }),
  );

  if (!response.ok) {
    throw new Error(`Analytics request failed with status ${response.status}`);
  }

  return response.json();
}

export async function fetchAnalyticsDrilldown(
  type: string,
  range: string,
  options?: {
    pageSize?: number;
    cursor?: string | null;
  },
): Promise<AnalyticsDrilldownResponse> {
  // Drilldowns reuse cursor pagination so modal detail views can grow without loading everything.
  const searchParams = new URLSearchParams({
    type,
    range,
  });

  if (typeof options?.pageSize === "number") {
    searchParams.set("pageSize", String(options.pageSize));
  }

  if (options?.cursor) {
    searchParams.set("cursor", options.cursor);
  }

  const response = await fetchLenderApiWithQuery(
    "/analytics/drilldown",
    searchParams,
  );

  if (!response.ok) {
    throw new Error(
      `Analytics drilldown failed with status ${response.status}`,
    );
  }

  return response.json();
}
