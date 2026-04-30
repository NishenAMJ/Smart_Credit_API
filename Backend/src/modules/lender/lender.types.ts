export type LenderDashboardSummary = {
  totalBorrowers: number;
  todaysCollection: number;
  overduePayments: number;
  activeAds: number;
};

export type LenderDashboardSummaryResponse = {
  summary: LenderDashboardSummary;
  generatedAt: string;
};
