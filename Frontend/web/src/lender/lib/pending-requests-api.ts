// Pending request API contracts for lender review and decision flows.
import {
  fetchLenderApi,
  fetchLenderApiWithQuery,
  parseApiError,
} from "./api-client";

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

export type PendingRequestDecisionResponse = {
  requestId: string;
  status: string;
  updatedAt: string;
};

export type FetchPendingRequestsOptions = {
  limit?: number;
  adId?: string | null;
  includeSummary?: boolean;
  includeAllStatuses?: boolean;
  cursor?: string | null;
};

export async function fetchPendingRequests(
  options: number | FetchPendingRequestsOptions = 30,
): Promise<PendingRequestsResponse> {
  // Accepts either a raw limit or a richer options object to keep simple call sites concise.
  const normalizedOptions: FetchPendingRequestsOptions =
    typeof options === "number" ? { limit: options } : options;

  const searchParams = new URLSearchParams({
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

  const response = await fetchLenderApiWithQuery(
    "/loan-requests/pending",
    searchParams,
  );

  if (!response.ok) {
    throw new Error(`Pending requests failed with status ${response.status}`);
  }

  return response.json();
}

export async function approvePendingRequest(
  requestId: string,
  notes?: string,
): Promise<PendingRequestDecisionResponse> {
  // Optional notes are trimmed before they are attached to the approval audit trail.
  const response = await fetchLenderApi(
    `/loan-requests/${encodeURIComponent(requestId)}/approve`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        notes: notes?.trim() || undefined,
      }),
    },
  );

  if (!response.ok) {
    return parseApiError(response, "Failed to approve the pending request.");
  }

  return response.json();
}

export async function rejectPendingRequest(
  requestId: string,
  reason: string,
): Promise<PendingRequestDecisionResponse> {
  // Rejection requires a reason because the UI surfaces it back to the lender workflow.
  const response = await fetchLenderApi(
    `/loan-requests/${encodeURIComponent(requestId)}/reject`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        reason: reason.trim(),
      }),
    },
  );

  if (!response.ok) {
    return parseApiError(response, "Failed to reject the pending request.");
  }

  return response.json();
}

export async function markPendingRequestUnderReview(
  requestId: string,
  notes?: string,
): Promise<PendingRequestDecisionResponse> {
  // Under-review keeps the request active while recording lender notes for the next pass.
  const response = await fetchLenderApi(
    `/loan-requests/${encodeURIComponent(requestId)}/review`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        notes: notes?.trim() || undefined,
      }),
    },
  );

  if (!response.ok) {
    return parseApiError(response, "Failed to move the request into review.");
  }

  return response.json();
}
