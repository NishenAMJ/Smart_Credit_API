import {
  fetchLenderApi,
  fetchLenderApiWithQuery,
  parseApiError,
} from "./api-client";

export type DashboardSummary = {
  totalBorrowers: number;
  todaysCollection: number;
  overduePayments: number;
  activeAds: number;
};

export type DashboardBorrower = {
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
};

export type DashboardSummaryResponse = {
  summary: DashboardSummary;
  generatedAt: string;
};

export type DashboardBorrowersResponse = {
  borrowers: DashboardBorrower[];
  generatedAt: string;
};

export type BorrowerDetails = {
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
  loans: BorrowerLoan[];
};

export type BorrowerLoan = {
  id: string;
  status: string;
  amount: number;
  remainingAmount: number;
  interestRate: number;
  tenureMonths: number;
  createdAt: string | null;
};

export async function fetchDashboardSummary(): Promise<DashboardSummaryResponse> {
  const response = await fetchLenderApi("/dashboard/summary");

  if (!response.ok) {
    return parseApiError(response, "Failed to load dashboard summary.");
  }

  return response.json();
}

export async function fetchDashboardBorrowers(
  limit = 24,
): Promise<DashboardBorrowersResponse> {
  const response = await fetchLenderApiWithQuery(
    "/dashboard/borrowers",
    new URLSearchParams({
      limit: String(limit),
    }),
  );

  if (!response.ok) {
    return parseApiError(response, "Failed to load dashboard borrowers.");
  }

  return response.json();
}

export async function fetchBorrowerDetails(
  borrowerId: string,
): Promise<BorrowerDetails> {
  const response = await fetchLenderApi(
    `/dashboard/borrowers/${encodeURIComponent(borrowerId)}`,
  );

  if (!response.ok) {
    return parseApiError(response, "Failed to load borrower details.");
  }

  return response.json();
}
