export interface DashboardSummary {
  totalBorrowers: number;
  todaysCollection: number;
  overduePayments: number;
  activeAds: number;
}

export interface DashboardBorrower {
  id: string;
  fullName: string;
  email: string;
  creditScore: number | null;
  kycStatus: string;
  activeLoansCount: number;
  isActive: boolean;
  createdAt: string | null;
}

export interface DashboardOverviewResponse {
  summary: DashboardSummary;
  recentBorrowers: DashboardBorrower[];
  generatedAt: string;
}

export interface BorrowerDetailsResponse {
  id: string;
  role: string;
  fullName: string;
  email: string;
  phone: string | null;
  address: string | null;
  nic: string | null;
  kycStatus: string;
  creditScore: number | null;
  rating: number | null;
  activeLoansCount: number;
  isActive: boolean;
  createdAt: string | null;
}
