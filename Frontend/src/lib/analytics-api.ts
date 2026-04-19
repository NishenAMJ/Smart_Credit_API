export type AnalyticsRange = {
  key: string
  label: string
  startDate: string
  endDate: string
}

export type AnalyticsSummary = {
  totalLent: number
  totalCollected: number
  activeLoans: number
  repaymentSuccessRate: number
}

export type AnalyticsTrendPoint = {
  label: string
  value: number
}

export type AnalyticsBreakdownPoint = {
  label: string
  value: number
}

export type AnalyticsOverviewResponse = {
  lenderId: string
  range: AnalyticsRange
  summary: AnalyticsSummary
  trends: {
    lendingByMonth: AnalyticsTrendPoint[]
    collectionByMonth: AnalyticsTrendPoint[]
  }
  breakdowns: {
    loanStatus: AnalyticsBreakdownPoint[]
  }
  performance: {
    activeAds: number
    requestsReceived: number
    acceptedRequests: number
    requestToLoanConversionRate: number
  }
  portfolio: {
    outstandingAmount: number
    averageLoanSize: number
    averageInterestRate: number
    averageTenureMonths: number
  }
  risk: {
    overdueLoans: number
    defaultedLoans: number
    openDisputes: number
    averageBorrowerCreditScore: number | null
  }
  insights: string[]
}

export type AnalyticsDrilldownItem = {
  id: string
  title: string
  subtitle: string
  status: string
  metric: string
  secondaryMetric: string | null
  date: string | null
}

export type AnalyticsDrilldownResponse = {
  lenderId: string
  range: AnalyticsRange
  type: string
  title: string
  description: string
  items: AnalyticsDrilldownItem[]
}
