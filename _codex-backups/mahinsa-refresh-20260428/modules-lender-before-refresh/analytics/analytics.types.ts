export interface AnalyticsRangeResponse {
  key: string;
  label: string;
  startDate: string;
  endDate: string;
}

export interface AnalyticsSummary {
  totalLent: number;
  totalCollected: number;
  activeLoans: number;
  repaymentSuccessRate: number;
}

export interface AnalyticsTrendPoint {
  label: string;
  value: number;
}

export interface AnalyticsBreakdownPoint {
  label: string;
  value: number;
}

export interface AnalyticsPerformance {
  activeAds: number;
  requestsReceived: number;
  acceptedRequests: number;
  requestToLoanConversionRate: number;
}

export interface AnalyticsPortfolio {
  outstandingAmount: number;
  averageLoanSize: number;
  averageInterestRate: number;
  averageTenureMonths: number;
}

export interface AnalyticsRisk {
  overdueLoans: number;
  defaultedLoans: number;
  openDisputes: number;
  averageBorrowerCreditScore: number | null;
}

export interface AnalyticsSummaryResponse {
  lenderId: string;
  range: AnalyticsRangeResponse;
  summary: AnalyticsSummary;
  performance: AnalyticsPerformance;
  portfolio: AnalyticsPortfolio;
  risk: AnalyticsRisk;
}

export interface AnalyticsOverviewResponse {
  lenderId: string;
  range: AnalyticsRangeResponse;
  summary: AnalyticsSummary;
  trends: {
    lendingByMonth: AnalyticsTrendPoint[];
    collectionByMonth: AnalyticsTrendPoint[];
  };
  breakdowns: {
    loanStatus: AnalyticsBreakdownPoint[];
  };
  performance: AnalyticsPerformance;
  portfolio: AnalyticsPortfolio;
  risk: AnalyticsRisk;
  insights: string[];
}

export interface AnalyticsDrilldownItem {
  id: string;
  title: string;
  subtitle: string;
  status: string;
  metric: string;
  secondaryMetric: string | null;
  date: string | null;
}

export interface AnalyticsDrilldownPageInfo {
  pageSize: number;
  hasMore: boolean;
  nextCursor: string | null;
}

export interface AnalyticsDrilldownResponse {
  lenderId: string;
  range: AnalyticsRangeResponse;
  type: string;
  title: string;
  description: string;
  items: AnalyticsDrilldownItem[];
  pageInfo: AnalyticsDrilldownPageInfo;
}
