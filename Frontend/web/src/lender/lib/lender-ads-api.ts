const API_BASE_URL =
  (import.meta.env.VITE_API_BASE_URL as string | undefined)?.replace(
    /\/$/,
    "",
  ) ?? "http://localhost:3000/api";

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
  lenderId: string;
  lenderName: string;
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

async function extractError(
  response: Response,
  fallback: string,
): Promise<never> {
  try {
    const body = (await response.json()) as { message?: string | string[] };
    const message = Array.isArray(body.message)
      ? body.message.join(", ")
      : body.message;

    throw new Error(message || fallback);
  } catch (error) {
    if (error instanceof Error) {
      throw error;
    }

    throw new Error(fallback);
  }
}

export async function createLenderAd(
  payload: CreateLenderAdPayload,
): Promise<LenderAd> {
  const response = await fetch(`${API_BASE_URL}/lender-ads`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    return extractError(response, "Failed to publish lender ad.");
  }

  return response.json();
}

export async function fetchLenderAds(
  lenderId: string,
  limit = 4,
): Promise<LenderAd[]> {
  const response = await fetch(
    `${API_BASE_URL}/lender-ads?lenderId=${encodeURIComponent(lenderId)}&limit=${limit}`,
  );

  if (!response.ok) {
    return extractError(response, "Failed to load lender ads.");
  }

  const body = (await response.json()) as LenderAdsListResponse;
  return body.ads;
}
