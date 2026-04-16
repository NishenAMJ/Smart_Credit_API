export type DashboardSummary = {
  totalBorrowers: number
  todaysCollection: number
  overduePayments: number
  activeAds: number
}

export type DashboardBorrower = {
  id: string
  fullName: string
  email: string
  creditScore: number | null
  kycStatus: string
  activeLoansCount: number
  isActive: boolean
  createdAt: string | null
}

export type DashboardOverviewResponse = {
  summary: DashboardSummary
  recentBorrowers: DashboardBorrower[]
  generatedAt: string
}
