import { api, getCurrentUserId } from './api';

// ─────────────────────────────────────────────────────────────
// The shared auth layer in api.ts now owns the current user id.
// ─────────────────────────────────────────────────────────────

export const setLenderId = (id: string) => {
  // No-op: the shared auth layer now owns the current user id.
};

const getLenderId = (): string => getCurrentUserId();

export const AdService = {

  // ── Browse ads (for borrowers) ───────────────────
  getAllAds: async (filters?: {
    location?: string;
    purpose?: string;
    search?: string;
    minAmount?: number;
    maxAmount?: number;
  }) => {
    const params = new URLSearchParams();
    if (filters?.location)  params.append('location',  filters.location);
    if (filters?.purpose)   params.append('purpose',   filters.purpose);
    if (filters?.search)    params.append('search',    filters.search);
    if (filters?.minAmount) params.append('minAmount', String(filters.minAmount));
    if (filters?.maxAmount) params.append('maxAmount', String(filters.maxAmount));

    const query = params.toString() ? `?${params.toString()}` : '';
    return api.get(`/advertisements${query}`);
  },

  // ── Get lender's own ads ─────────────────────────
  getMyAds: async () => {
    const lenderId = getLenderId();
    return api.get(`/advertisements/my?lenderId=${lenderId}`);
  },

  // ── Get single ad ────────────────────────────────
  getAdById: async (adId: string) => {
    return api.get(`/advertisements/${adId}`);
  },

  // ── Create ad ────────────────────────────────────
  createAd: async (data: any) => {
    const lenderId = getLenderId();
    return api.post(`/advertisements?lenderId=${lenderId}`, data);
  },

  // ── Update ad ────────────────────────────────────
  updateAd: async (adId: string, data: any) => {
    const lenderId = getLenderId();
    return api.patch(`/advertisements/${adId}?lenderId=${lenderId}`, data);
  },

  // ── Soft delete ad ───────────────────────────────
  deleteAd: async (adId: string) => {
    const lenderId = getLenderId();
    return api.delete(`/advertisements/${adId}?lenderId=${lenderId}`);
  },

  // ── Pause ad ─────────────────────────────────────
  pauseAd: async (adId: string) => {
    const lenderId = getLenderId();
    return api.patch(`/advertisements/${adId}/pause?lenderId=${lenderId}`);
  },

  // ── Activate ad ──────────────────────────────────
  activateAd: async (adId: string) => {
    const lenderId = getLenderId();
    return api.patch(`/advertisements/${adId}/activate?lenderId=${lenderId}`);
  },

  // ── Boost ad ─────────────────────────────────────
  boostAd: async (adId: string, data: {
    package: string;
    amount: number;
    paymentReference: string;
  }) => {
    const lenderId = getLenderId();
    return api.post(`/advertisements/${adId}/boost?lenderId=${lenderId}`, data);
  },

  // ── Get boost packages ───────────────────────────
  getBoostPackages: async () => {
    return api.get('/advertisements/boost-packages');
  },

  // ── Cancel boost ─────────────────────────────────
  cancelBoost: async (adId: string) => {
    const lenderId = getLenderId();
    return api.patch(`/advertisements/${adId}/boost/cancel?lenderId=${lenderId}`);
  },

  // ── Analytics summary (all lender ads) ───────────
  getAnalyticsSummary: async () => {
    const lenderId = getLenderId();
    return api.get(`/advertisements/analytics/summary?lenderId=${lenderId}`);
  },

  // ── Full analytics for one ad ─────────────────────
  getAdAnalytics: async (adId: string) => {
    const lenderId = getLenderId();
    return api.get(`/advertisements/${adId}/analytics/full?lenderId=${lenderId}`);
  },

  // ── Track view ───────────────────────────────────
  trackView: async (adId: string) => {
    return api.post(`/advertisements/${adId}/view`);
  },

  // ── Track click ──────────────────────────────────
  trackClick: async (adId: string) => {
    return api.post(`/advertisements/${adId}/click`);
  },
};