import axios from 'axios';

const api = axios.create({
  baseURL: process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3000',
  timeout: 10000,
});

const getLenderId = (): string => {
  return 'lender_001';
};

export const AdService = {

  // ── Get all active ads for borrowers ────────────
  getAllAds: async (filters?: {
    location?: string;
    purpose?: string;
    search?: string;
    minAmount?: number;
    maxAmount?: number;
  }) => {
    const params = new URLSearchParams();
    if (filters?.location) params.append('location', filters.location);
    if (filters?.purpose) params.append('purpose', filters.purpose);
    if (filters?.search) params.append('search', filters.search);
    if (filters?.minAmount) params.append('minAmount', String(filters.minAmount));
    if (filters?.maxAmount) params.append('maxAmount', String(filters.maxAmount));

    const url = params.toString() ? `/advertisements?${params.toString()}` : '/advertisements';
    const res = await api.get(url);
    return res.data;
  },

  // ── Get lender's own ads ────────────────────────
  getMyAds: async () => {
    const lenderId = getLenderId();
    const res = await api.get(`/advertisements/my?lenderId=${lenderId}`);
    return res.data;
  },

  // ── Get single ad ───────────────────────────────
  getAdById: async (adId: string) => {
    const res = await api.get(`/advertisements/${adId}`);
    return res.data;
  },

  // ── Create ad ───────────────────────────────────
  createAd: async (data: any) => {
    const lenderId = getLenderId();
    const res = await api.post(`/advertisements?lenderId=${lenderId}`, data);
    return res.data;
  },

  // ── Update ad ───────────────────────────────────
  updateAd: async (adId: string, data: any) => {
    const lenderId = getLenderId();
    const res = await api.patch(`/advertisements/${adId}?lenderId=${lenderId}`, data);
    return res.data;
  },

  // ── Delete ad (soft delete) ──────────────────────
  deleteAd: async (adId: string) => {
    const lenderId = getLenderId();
    const res = await api.delete(`/advertisements/${adId}?lenderId=${lenderId}`);
    return res.data;
  },

  // ── Hard delete ad ──────────────────────────────
  hardDeleteAd: async (adId: string) => {
    const lenderId = getLenderId();
    const res = await api.delete(`/advertisements/${adId}/hard?lenderId=${lenderId}`);
    return res.data;
  },

  // ── Pause ad ────────────────────────────────────
  pauseAd: async (adId: string) => {
    const lenderId = getLenderId();
    const res = await api.patch(`/advertisements/${adId}/pause?lenderId=${lenderId}`);
    return res.data;
  },

  // ── Activate ad ─────────────────────────────────
  activateAd: async (adId: string) => {
    const lenderId = getLenderId();
    const res = await api.patch(`/advertisements/${adId}/activate?lenderId=${lenderId}`);
    return res.data;
  },

  // ── Boost ad ─────────────────────────────────────
  boostAd: async (adId: string, data: any) => {
    const lenderId = getLenderId();
    const res = await api.post(`/advertisements/${adId}/boost?lenderId=${lenderId}`, data);
    return res.data;
  },

  // ── Get boost packages ───────────────────────────
  getBoostPackages: async () => {
    const res = await api.get(`/advertisements/boost-packages`);
    return res.data;
  },

  // ── Cancel boost ─────────────────────────────────
  cancelBoost: async (adId: string) => {
    const lenderId = getLenderId();
    const res = await api.patch(`/advertisements/${adId}/boost/cancel?lenderId=${lenderId}`);
    return res.data;
  },

  // ── Get analytics summary ────────────────────────
  getAnalyticsSummary: async () => {
    const lenderId = getLenderId();
    const res = await api.get(`/advertisements/analytics/summary?lenderId=${lenderId}`);
    return res.data;
  },

  // ── Get single ad analytics ──────────────────────
  getAdAnalytics: async (adId: string) => {
    const lenderId = getLenderId();
    const res = await api.get(`/advertisements/${adId}/analytics/full?lenderId=${lenderId}`);
    return res.data;
  },

  // ── Track view ───────────────────────────────────
  trackView: async (adId: string) => {
    await api.post(`/advertisements/${adId}/view`);
  },

  // ── Track click ──────────────────────────────────
  trackClick: async (adId: string) => {
    await api.post(`/advertisements/${adId}/click`);
  },
};