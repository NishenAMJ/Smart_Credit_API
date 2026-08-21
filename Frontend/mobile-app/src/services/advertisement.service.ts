import { api } from "./api";

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
};
