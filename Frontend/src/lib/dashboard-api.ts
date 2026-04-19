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

export type BorrowerDetails = {
  id: string
  role: string
  fullName: string
  email: string
  phone: string | null
  address: string | null
  nic: string | null
  kycStatus: string
  creditScore: number | null
  rating: number | null
  activeLoansCount: number
  isActive: boolean
  createdAt: string | null
}
