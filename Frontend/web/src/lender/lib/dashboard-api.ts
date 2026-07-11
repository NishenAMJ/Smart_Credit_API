// Dashboard API models for summary metrics, borrower tables, and borrower detail modals.
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
  pageInfo: {
    pageSize: number;
    hasMore: boolean;
    nextCursor: string | null;
  };
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
  // Returns a small summary block that powers the dashboard metric cards.
  const response = await fetchLenderApi("/dashboard/summary");

  if (!response.ok) {
    return parseApiError(response, "Failed to load dashboard summary.");
  }

  return response.json();
}

export async function fetchDashboardBorrowers(
  pageSize = 8,
  cursor?: string | null,
  search?: string,
): Promise<DashboardBorrowersResponse> {
  // The borrower table supports cursor pagination and optional keyword filtering in one endpoint.
  const searchParams = new URLSearchParams({
    pageSize: String(pageSize),
  });

  if (cursor) {
    searchParams.set("cursor", cursor);
  }

  if (search && search.trim().length > 0) {
    searchParams.set("search", search.trim());
  }

  const response = await fetchLenderApiWithQuery(
    "/dashboard/borrowers",
    searchParams,
  );

  if (!response.ok) {
    return parseApiError(response, "Failed to load dashboard borrowers.");
  }

  return response.json();
}

export async function fetchBorrowerDetails(
  borrowerId: string,
): Promise<BorrowerDetails> {
  // Borrower details are loaded lazily when the dashboard modal opens.
  const response = await fetchLenderApi(
    `/dashboard/borrowers/${encodeURIComponent(borrowerId)}`,
  );

  if (!response.ok) {
    return parseApiError(response, "Failed to load borrower details.");
  }

  return response.json();
}
