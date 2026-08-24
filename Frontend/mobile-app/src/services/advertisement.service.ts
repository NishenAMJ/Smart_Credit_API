import { api } from "./api";
import type { ImagePickerAsset } from "expo-image-picker";

export interface CreateAdvertisementInput {
  headline: string;
  minAmount: number;
  maxAmount: number;
  interestRate: number;
  minTenureMonths?: number;
  tenureMonths: number;
  borrowerFocus: string;
  processingTime: string;
  responseTimeHours?: number;
  preferredPurposes?: string[];
  repaymentStyle: string;
  requirements: string;
  supportNote: string;
}

export interface AdvertisementAnalytics {
  adId: string;
  title: string;
  status: string;
  createdAt: string | null;
  expiresAt: string | null;
  applications: {
    total: number;
    submitted: number;
    underReview: number;
    approved: number;
    rejected: number;
    converted: number;
  };
  loans: {
    funded: number;
    active: number;
    overdue: number;
    completed: number;
    defaulted: number;
  };
  fundingRate: number;
}

export interface AdvertisementPage {
  ads: any[];
  pageInfo: {
    hasMore: boolean;
    nextCursor: string | null;
  };
}

export interface AdBoostPlan {
  id: string;
  name: string;
  durationDays: number;
  amountMinor: number;
  currency: "LKR";
}

export const AdService = {
  getMyAds: async (status?: string, cursor?: string | null) => {
    const params = new URLSearchParams({ pageSize: "12" });
    if (status) params.append("status", status);
    if (cursor) params.append("cursor", cursor);
    return api.get<AdvertisementPage>(`/lender-ads?${params.toString()}`);
  },

  getAdAnalytics: async (adId: string) =>
    api.get<AdvertisementAnalytics>(`/lender-ads/${adId}/analytics`),

  createAd: async (data: CreateAdvertisementInput) =>
    api.post("/lender-ads", data),

  updateAd: async (adId: string, data: Record<string, unknown>) =>
    api.patch(`/lender-ads/${adId}`, data),

  pauseAd: async (adId: string) =>
    api.patch(`/lender-ads/${adId}`, { status: "paused" }),

  activateAd: async (adId: string) =>
    api.patch(`/lender-ads/${adId}`, { status: "active" }),


  getBoostPlans: () =>
    api.get<{ plans: AdBoostPlan[]; bankAccount: Record<string, string> }>(
      "/lender-ad-boosts/plans",
    ),

  createBoost: (data: {
    listingId: string;
    planId: string;
    paymentMethod: "card" | "bank_transfer";
  }) =>
    api.post<any>("/lender-ad-boosts", data),

  uploadBoostReceipt: async (asset: ImagePickerAsset, boostId: string) => {
    const fileName = asset.fileName || `boost-receipt-${Date.now()}.jpg`;
    const mimeType = asset.mimeType || "image/jpeg";
    const intent = await api.post<any>("/documents/uploads/init", {
      category: "payment_receipt",
      documentType: "ad_boost_bank_receipt",
      fileName,
      contentType: mimeType,
      relatedEntityType: "ad_boost",
      relatedEntityId: boostId,
    });
    const form = new FormData();
    form.append("file", { uri: asset.uri, name: fileName, type: mimeType } as any);
    form.append("api_key", String(intent.apiKey));
    form.append("timestamp", String(intent.timestamp));
    form.append("signature", intent.signature);
    form.append("folder", intent.folder);
    form.append("public_id", intent.publicId);
    form.append("type", intent.deliveryType);
    const uploadedResponse = await fetch(intent.uploadUrl, { method: "POST", body: form });
    if (!uploadedResponse.ok) throw new Error("The receipt could not be uploaded.");
    const uploaded = await uploadedResponse.json();
    const completed = await api.post<{ documentId: string }>("/documents/uploads/complete", {
      publicId: uploaded.public_id,
      assetId: uploaded.asset_id,
      resourceType: uploaded.resource_type,
      deliveryType: uploaded.type,
      bytes: uploaded.bytes,
      version: uploaded.version,
      secureUrl: uploaded.secure_url,
      format: uploaded.format,
      fileHash: `boost-receipt-${boostId}-${asset.fileSize ?? 0}-${Date.now()}`,
      originalFilename: fileName,
      mimeType,
      category: "payment_receipt",
      documentType: "ad_boost_bank_receipt",
      relatedEntityType: "ad_boost",
      relatedEntityId: boostId,
      displayName: "Advertisement boost payment receipt",
    });
    return completed.documentId;
  },

  submitBoostReceipt: (boostId: string, receiptDocumentId: string, bankReference: string) =>
    api.post(`/lender-ad-boosts/${boostId}/receipt`, { receiptDocumentId, bankReference }),

};
