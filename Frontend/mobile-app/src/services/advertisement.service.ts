import { api } from "./api";

export interface CreateAdvertisementInput {
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
}

export const AdService = {
  getMyAds: async (status?: string) => {
    const params = new URLSearchParams({ pageSize: "12" });
    if (status) params.append("status", status);
    return api.get(`/lender-ads?${params.toString()}`);
  },

  createAd: async (data: CreateAdvertisementInput) =>
    api.post("/lender-ads", data),

  updateAd: async (adId: string, data: Record<string, unknown>) =>
    api.patch(`/lender-ads/${adId}`, data),

  pauseAd: async (adId: string) =>
    api.patch(`/lender-ads/${adId}`, { status: "paused" }),

  activateAd: async (adId: string) =>
    api.patch(`/lender-ads/${adId}`, { status: "active" }),
};
