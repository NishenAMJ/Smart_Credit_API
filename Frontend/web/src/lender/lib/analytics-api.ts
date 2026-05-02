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

const API_BASE_URL =
  (import.meta.env.VITE_API_BASE_URL as string | undefined)?.replace(
    /\/$/,
    "",
  ) ?? "http://localhost:3000/api";

export async function fetchAnalyticsOverview(
  lenderId: string,
  range: string,
): Promise<AnalyticsOverviewResponse> {
  const response = await fetch(
    `${API_BASE_URL}/analytics/overview?lenderId=${encodeURIComponent(
      lenderId,
    )}&range=${encodeURIComponent(range)}`,
  );

  if (!response.ok) {
    throw new Error(`Analytics request failed with status ${response.status}`);
  }

  return response.json();
}

export async function fetchAnalyticsDrilldown(
  lenderId: string,
  type: string,
  range: string,
  options?: {
    pageSize?: number;
    cursor?: string | null;
  },
): Promise<AnalyticsDrilldownResponse> {
  const searchParams = new URLSearchParams({
    lenderId,
    type,
    range,
  });

  if (typeof options?.pageSize === "number") {
    searchParams.set("pageSize", String(options.pageSize));
  }

  if (options?.cursor) {
    searchParams.set("cursor", options.cursor);
  }

  const response = await fetch(
    `${API_BASE_URL}/analytics/drilldown?${searchParams.toString()}`,
  );

  if (!response.ok) {
    throw new Error(
      `Analytics drilldown failed with status ${response.status}`,
    );
  }

  return response.json();
}
