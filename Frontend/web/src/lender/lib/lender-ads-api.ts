// API helpers for the lender ad composer and recent ad list.
import {
  fetchLenderApi,
  fetchLenderApiWithQuery,
  parseApiError,
} from "./api-client";

export type LenderAd = {
  id: string;
  adId: string;
  lenderId: string;
  lenderName: string | null;
  title: string;
  description: string;
  minAmount: number;
  maxAmount: number;
  preferredInterestRate: number;
  maxTenureMonths: number;
  location: string;
  preferredPurposes: string[];
  status: string;
  isBoosted: boolean;
  availableCapital: number;
  applicationCount: number;
  fundedLoansCount: number;
  responseTimeHours: number;
  expiresAt: string | null;
  createdAt: string | null;
  updatedAt: string | null;
  searchKeywords: string[];
  seedBatchId: string;
  source: string;
};

export type CursorPageInfo = {
  pageSize: number;
  hasMore: boolean;
  nextCursor: string | null;
};

export type LenderAdsListResponse = {
  lenderId: string;
  ads: LenderAd[];
  pageInfo: CursorPageInfo;
};

export type CreateLenderAdPayload = {
  headline: string;
  minAmount: number;
  maxAmount: number;
  interestRate: number;
  tenureMonths: number;
  borrowerFocus: string;
  processingTime: string;
  repaymentStyle: string;
  requirements: string;
  supportNote: string;
};

export async function createLenderAd(
  payload: CreateLenderAdPayload,
): Promise<LenderAd> {
  // Publishes the current draft and returns the created ad so the UI can refresh optimistically.
  const response = await fetchLenderApi("/lender-ads", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    return parseApiError(response, "Failed to publish lender ad.");
  }

  return response.json();
}

export async function fetchLenderAds(limit = 4): Promise<LenderAd[]> {
  // The page only needs the ad array, so this helper unwraps the paged response body.
  const response = await fetchLenderApiWithQuery(
    "/lender-ads",
    new URLSearchParams({
      limit: String(limit),
    }),
  );

  if (!response.ok) {
    return parseApiError(response, "Failed to load lender ads.");
  }

  const body = (await response.json()) as LenderAdsListResponse;
  return body.ads;
}
