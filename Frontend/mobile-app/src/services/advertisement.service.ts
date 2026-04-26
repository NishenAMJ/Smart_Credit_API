import axios from 'axios';

// Change this to your backend URL
const BASE_URL = 'http://YOUR_IP:3000/advertisements';

// Replace with real lenderId from auth later
// For now hardcoded for testing
const LENDER_ID = 'lender_001';

export const AdService = {

  // ── Get all active ads ──────────────────────────
  getAllAds: async (filters?: {
    location?: string;
    purpose?: string;
    search?: string;
  }) => {
    const params = new URLSearchParams();
    if (filters?.location) params.append('location', filters.location);
    if (filters?.purpose)  params.append('purpose',  filters.purpose);
    if (filters?.search)   params.append('search',   filters.search);
    const res = await axios.get(`${BASE_URL}?${params.toString()}`);
    return res.data;
  },

  // ── Get my ads ───────────────────────────────────
  getMyAds: async () => {
    const res = await axios.get(
      `${BASE_URL}/my?lenderId=${LENDER_ID}`,
    );
    return res.data;
  },

  // ── Get single ad ────────────────────────────────
  getAdById: async (adId: string) => {
    const res = await axios.get(`${BASE_URL}/${adId}`);
    return res.data;
  },

  // ── Create ad ────────────────────────────────────
  createAd: async (data: any) => {
    const res = await axios.post(
      `${BASE_URL}?lenderId=${LENDER_ID}`,
      data,
    );
    return res.data;
  },

  // ── Update ad ────────────────────────────────────
  updateAd: async (adId: string, data: any) => {
    const res = await axios.patch(
      `${BASE_URL}/${adId}?lenderId=${LENDER_ID}`,
      data,
    );
    return res.data;
  },

  // ── Delete ad (soft) ─────────────────────────────
  deleteAd: async (adId: string) => {
    const res = await axios.delete(
      `${BASE_URL}/${adId}?lenderId=${LENDER_ID}`,
    );
    return res.data;
  },

  // ── Pause ad ─────────────────────────────────────
  pauseAd: async (adId: string) => {
    const res = await axios.patch(
      `${BASE_URL}/${adId}/pause?lenderId=${LENDER_ID}`,
    );
    return res.data;
  },

  // ── Activate ad ──────────────────────────────────
  activateAd: async (adId: string) => {
    const res = await axios.patch(
      `${BASE_URL}/${adId}/activate?lenderId=${LENDER_ID}`,
    );
    return res.data;
  },

  // ── Boost ad ─────────────────────────────────────
  boostAd: async (adId: string, data: any) => {
    const res = await axios.post(
      `${BASE_URL}/${adId}/boost?lenderId=${LENDER_ID}`,
      data,
    );
    return res.data;
  },

  // ── Get boost packages ───────────────────────────
  getBoostPackages: async () => {
    const res = await axios.get(`${BASE_URL}/boost-packages`);
    return res.data;
  },

  // ── Cancel boost ─────────────────────────────────
  cancelBoost: async (adId: string) => {
    const res = await axios.patch(
      `${BASE_URL}/${adId}/boost/cancel?lenderId=${LENDER_ID}`,
    );
    return res.data;
  },

  // ── Get analytics summary ────────────────────────
  getAnalyticsSummary: async () => {
    const res = await axios.get(
      `${BASE_URL}/analytics/summary?lenderId=${LENDER_ID}`,
    );
    return res.data;
  },

  // ── Get single ad analytics ──────────────────────
  getAdAnalytics: async (adId: string) => {
    const res = await axios.get(
      `${BASE_URL}/${adId}/analytics/full?lenderId=${LENDER_ID}`,
    );
    return res.data;
  },

  // ── Track view ───────────────────────────────────
  trackView: async (adId: string) => {
    await axios.post(`${BASE_URL}/${adId}/view`);
  },

  // ── Track click ──────────────────────────────────
  trackClick: async (adId: string) => {
    await axios.post(`${BASE_URL}/${adId}/click`);
  },
};