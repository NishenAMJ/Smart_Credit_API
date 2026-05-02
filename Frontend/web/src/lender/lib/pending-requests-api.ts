const API_BASE_URL =
  (import.meta.env.VITE_API_BASE_URL as string | undefined)?.replace(
    /\/$/,
    "",
  ) ?? "http://localhost:3000/api";

export type PendingRequestsSummary = {
  totalPendingRequests: number;
  targetedRequests: number;
  marketplaceMatches: number;
  highUrgencyRequests: number;
};

export type CursorPageInfo = {
  pageSize: number;
  hasMore: boolean;
  nextCursor: string | null;
};

export type PendingRequest = {
  requestId: string;
  borrowerId: string;
  borrowerName: string;
  borrowerEmail: string;
  borrowerPhone: string | null;
  borrowerCreditScore: number | null;
  borrowerKycStatus: string;
  amount: number;
  tenureMonths: number;
  purpose: string;
  purposeCategory: string;
  status: string;
  urgency: string;
  suggestedInterestRate: number;
  monthlyIncome: number;
  incomeSource: string;
  requestedRegion: string;
  collateralOffered: boolean;
  targetType: "targeted" | "marketplace";
  adId: string | null;
  adTitle: string | null;
  createdAt: string | null;
  updatedAt: string | null;
  notes: string;
  matchedLenderIds: string[];
};

export type PendingRequestsResponse = {
  lenderId: string;
  summary: PendingRequestsSummary;
  requests: PendingRequest[];
  pageInfo: CursorPageInfo;
  generatedAt: string;
};

export type FetchPendingRequestsOptions = {
  limit?: number;
  adId?: string | null;
  includeSummary?: boolean;
  includeAllStatuses?: boolean;
  cursor?: string | null;
};

export async function fetchPendingRequests(
  lenderId: string,
  options: number | FetchPendingRequestsOptions = 30,
): Promise<PendingRequestsResponse> {
  const normalizedOptions: FetchPendingRequestsOptions =
    typeof options === "number" ? { limit: options } : options;

  const searchParams = new URLSearchParams({
    lenderId,
    limit: String(normalizedOptions.limit ?? 30),
  });

  if (normalizedOptions.adId) {
    searchParams.set("adId", normalizedOptions.adId);
  }

  if (normalizedOptions.includeSummary === false) {
    searchParams.set("includeSummary", "false");
  }

  if (normalizedOptions.includeAllStatuses) {
    searchParams.set("includeAllStatuses", "true");
  }

  if (normalizedOptions.cursor) {
    searchParams.set("cursor", normalizedOptions.cursor);
  }

  const response = await fetch(
    `${API_BASE_URL}/loan-requests/pending?${searchParams.toString()}`,
  );

  if (!response.ok) {
    throw new Error(`Pending requests failed with status ${response.status}`);
  }

  return response.json();
}
