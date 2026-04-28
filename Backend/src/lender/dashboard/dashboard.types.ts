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
  loanCount: number;
  activeLoansCount: number;
  totalBorrowedAmount: number;
  outstandingAmount: number;
  latestLoanStatus: string;
  latestLoanCreatedAt: string | null;
  isActive: boolean;
  createdAt: string | null;
}

export interface DashboardSummaryResponse {
  summary: DashboardSummary;
  generatedAt: string;
}

export interface CursorPageInfo {
  pageSize: number;
  hasMore: boolean;
  nextCursor: string | null;
}

export interface DashboardBorrowersResponse {
  borrowers: DashboardBorrower[];
  pageInfo: CursorPageInfo;
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
  loanCount: number;
  activeLoansCount: number;
  totalBorrowedAmount: number;
  outstandingAmount: number;
  isActive: boolean;
  createdAt: string | null;
  loans: BorrowerLoanSummary[];
}

export interface BorrowerLoanSummary {
  id: string;
  status: string;
  amount: number;
  remainingAmount: number;
  interestRate: number;
  tenureMonths: number;
  createdAt: string | null;
}
