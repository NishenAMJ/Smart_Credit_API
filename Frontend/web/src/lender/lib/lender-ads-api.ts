import { API_BASE_URL, getAuthHeaders } from "./api-config";

export type LenderAd = {
  id: string;
  adId: string;
  lenderId: string;
  lenderName: string | null;
  title: string;
  description: string;
  borrowerFocus: string;
  processingTime: string;
  repaymentStyle: string;
  requirements: string;
  minAmount: number;
  maxAmount: number;
  preferredInterestRate: number;
  maxTenureMonths: number;
  location: string;
  preferredPurposes: string[];
  status: string;
  isBoosted: boolean;
  boostStatus: string | null;
  boostStartsAt: string | null;
  boostEndsAt: string | null;
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

export type AdBoostPlan = {
  id: string;
  name: string;
  durationDays: number;
  amountMinor: number;
  currency: "LKR";
};

export type AdBoost = {
  boostId: string;
  listingId: string;
  status: string;
  paymentMethod: "bank_transfer" | "card";
  plan: AdBoostPlan;
  checkout?: { orderId: string; paymentPageUrl: string };
  bankAccount?: Record<string, string>;
};

export async function fetchAdBoostPlans(): Promise<{
  plans: AdBoostPlan[];
  bankAccount: Record<string, string>;
}> {
  const response = await fetch(`${API_BASE_URL}/lender-ad-boosts/plans`, {
    headers: getAuthHeaders(),
  });
  if (!response.ok) return extractError(response, "Failed to load boost plans.");
  return response.json();
}

export async function createAdBoost(input: {
  listingId: string;
  planId: string;
  paymentMethod: "bank_transfer" | "card";
}): Promise<AdBoost> {
  const response = await fetch(`${API_BASE_URL}/lender-ad-boosts`, {
    method: "POST",
    headers: getAuthHeaders({ "Content-Type": "application/json" }),
    body: JSON.stringify(input),
  });
  if (!response.ok) return extractError(response, "Failed to start the boost.");
  return response.json();
}

export async function uploadBoostReceipt(file: File, boostId: string) {
  const initResponse = await fetch(`${API_BASE_URL}/documents/uploads/init`, {
    method: "POST",
    headers: getAuthHeaders({ "Content-Type": "application/json" }),
    body: JSON.stringify({
      category: "payment_receipt",
      documentType: "ad_boost_bank_receipt",
      fileName: file.name,
      contentType: file.type,
      relatedEntityType: "ad_boost",
      relatedEntityId: boostId,
    }),
  });
  if (!initResponse.ok) return extractError(initResponse, "Failed to prepare receipt upload.");
  const intent = (await initResponse.json()) as Record<string, string | number>;
  const form = new FormData();
  form.append("file", file);
  for (const key of ["apiKey", "timestamp", "signature", "folder", "publicId", "deliveryType"] as const) {
    const uploadKey = key === "apiKey" ? "api_key" : key === "publicId" ? "public_id" : key === "deliveryType" ? "type" : key;
    form.append(uploadKey, String(intent[key]));
  }
  const uploadResponse = await fetch(String(intent.uploadUrl), { method: "POST", body: form });
  if (!uploadResponse.ok) throw new Error("The receipt could not be uploaded.");
  const uploaded = (await uploadResponse.json()) as Record<string, string | number>;
  const fileHash = Array.from(new Uint8Array(await crypto.subtle.digest("SHA-256", await file.arrayBuffer())))
    .map((value) => value.toString(16).padStart(2, "0"))
    .join("");
  const completeResponse = await fetch(`${API_BASE_URL}/documents/uploads/complete`, {
    method: "POST",
    headers: getAuthHeaders({ "Content-Type": "application/json" }),
    body: JSON.stringify({
      publicId: uploaded.public_id,
      assetId: uploaded.asset_id,
      resourceType: uploaded.resource_type,
      deliveryType: uploaded.type,
      bytes: uploaded.bytes,
      version: uploaded.version,
      secureUrl: uploaded.secure_url,
      format: uploaded.format,
      fileHash,
      originalFilename: file.name,
      mimeType: file.type,
      category: "payment_receipt",
      documentType: "ad_boost_bank_receipt",
      relatedEntityType: "ad_boost",
      relatedEntityId: boostId,
      displayName: "Advertisement boost payment receipt",
    }),
  });
  if (!completeResponse.ok) return extractError(completeResponse, "Failed to register receipt.");
  return (await completeResponse.json()) as { documentId: string };
}

export async function submitBoostReceipt(boostId: string, receiptDocumentId: string, bankReference: string) {
  const response = await fetch(`${API_BASE_URL}/lender-ad-boosts/${encodeURIComponent(boostId)}/receipt`, {
    method: "POST",
    headers: getAuthHeaders({ "Content-Type": "application/json" }),
    body: JSON.stringify({ receiptDocumentId, bankReference }),
  });
  if (!response.ok) return extractError(response, "Failed to submit receipt.");
  return response.json();
}

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
    headers: getAuthHeaders({
      "Content-Type": "application/json",
    }),
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    return extractError(response, "Failed to submit the advertisement.");
  }

  return response.json();
}

export async function fetchLenderAdsPage(options?: {
  pageSize?: number;
  cursor?: string | null;
  status?: string | null;
}): Promise<LenderAdsListResponse> {
  const params = new URLSearchParams({
    pageSize: String(options?.pageSize ?? 12),
  });
  if (options?.cursor) params.set("cursor", options.cursor);
  if (options?.status) params.set("status", options.status);

  const response = await fetch(`${API_BASE_URL}/lender-ads?${params}`, {
    headers: getAuthHeaders(),
  });

  if (!response.ok) {
    return extractError(response, "Failed to load lender ads.");
  }

  return response.json();
}

export async function fetchLenderAds(limit = 4): Promise<LenderAd[]> {
  return (await fetchLenderAdsPage({ pageSize: limit })).ads;
}
