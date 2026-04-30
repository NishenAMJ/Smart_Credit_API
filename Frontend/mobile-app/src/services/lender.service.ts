import { api } from './api';

// ─────────────────────────────────────────────────────────────
// TODO: Replace this with real auth when ready.
// Example with Firebase Auth:
//   import { getAuth } from 'firebase/auth';
//   const getLenderId = () => getAuth().currentUser?.uid ?? '';
// ─────────────────────────────────────────────────────────────
let _lenderId = 'lender_004';

export const setLenderId = (id: string) => {
  _lenderId = id;
};

const getLenderId = (): string => {
  if (!_lenderId) throw new Error('User not authenticated');
  return _lenderId;
};

// ═══════════════════════════════════════════════════════════════
//  DASHBOARD  —  GET /dashboard/*
// ═══════════════════════════════════════════════════════════════
export const DashboardService = {

  // ── Summary stats (active loans, disbursed, repaid, etc.) ───
  getSummary: async () => {
    const lenderId = getLenderId();
    return api.get(`/dashboard/summary?lenderId=${lenderId}`);
  },

  // ── Paginated list of borrowers ──────────────────────────────
  getBorrowers: async (pageSize = 8, cursor?: string) => {
    const lenderId = getLenderId();
    const params = new URLSearchParams({ lenderId, pageSize: String(pageSize) });
    if (cursor) params.append('cursor', cursor);
    return api.get(`/dashboard/borrowers?${params.toString()}`);
  },

  // ── Single borrower details ──────────────────────────────────
  getBorrowerDetails: async (borrowerId: string) => {
    const lenderId = getLenderId();
    return api.get(`/dashboard/borrowers/${borrowerId}?lenderId=${lenderId}`);
  },
};

// ═══════════════════════════════════════════════════════════════
//  ANALYTICS  —  GET /analytics/*
// ═══════════════════════════════════════════════════════════════
export const AnalyticsService = {

  // ── High-level summary (total lent, repaid, overdue %) ──────
  getSummary: async (range: '30d' | '90d' | '365d' = '90d') => {
    const lenderId = getLenderId();
    return api.get(`/analytics/summary?lenderId=${lenderId}&range=${range}`);
  },

  // ── Overview chart data ──────────────────────────────────────
  getOverview: async (range: '30d' | '90d' | '365d' = '90d') => {
    const lenderId = getLenderId();
    return api.get(`/analytics/overview?lenderId=${lenderId}&range=${range}`);
  },

  // ── Drilldown — cursor-paginated detail for one metric type ──
  getDrilldown: async (
    type: string,
    range: '30d' | '90d' | '365d' = '90d',
    pageSize = 30,
    cursor?: string,
  ) => {
    const lenderId = getLenderId();
    const params = new URLSearchParams({ lenderId, type, range, pageSize: String(pageSize) });
    if (cursor) params.append('cursor', cursor);
    return api.get(`/analytics/drilldown?${params.toString()}`);
  },
};

// ═══════════════════════════════════════════════════════════════
//  LENDER ADS  —  /lender-ads  (Mahinsa's simple ad store)
// ═══════════════════════════════════════════════════════════════
export const LenderAdsService = {

  // ── Get all ads posted by this lender ───────────────────────
  getMyAds: async (pageSize = 6, cursor?: string) => {
    const lenderId = getLenderId();
    const params = new URLSearchParams({ lenderId, pageSize: String(pageSize) });
    if (cursor) params.append('cursor', cursor);
    return api.get(`/lender-ads?${params.toString()}`);
  },

  // ── Create a new lender ad ───────────────────────────────────
  createAd: async (data: {
    lenderName?: string | null;
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
  }) => {
    const lenderId = getLenderId();
    return api.post('/lender-ads', { ...data, lenderId });
  },
};

// ═══════════════════════════════════════════════════════════════
//  LOAN REQUESTS  —  GET /loan-requests/*
// ═══════════════════════════════════════════════════════════════
export const LoanRequestsService = {

  // ── Pending / all loan requests for this lender ─────────────
  getPendingRequests: async (options?: {
    pageSize?: number;
    cursor?: string;
    adId?: string;
    includeSummary?: boolean;
    includeAllStatuses?: boolean;
  }) => {
    const lenderId = getLenderId();
    const params = new URLSearchParams({ lenderId });
    if (options?.pageSize)            params.append('pageSize', String(options.pageSize));
    if (options?.cursor)              params.append('cursor', options.cursor);
    if (options?.adId)                params.append('adId', options.adId);
    if (options?.includeSummary === false) params.append('includeSummary', 'false');
    if (options?.includeAllStatuses)  params.append('includeAllStatuses', 'true');
    return api.get(`/loan-requests/pending?${params.toString()}`);
  },
};

// ═══════════════════════════════════════════════════════════════
//  RECENT TRANSACTIONS  —  /recent-transactions/*
// ═══════════════════════════════════════════════════════════════
export const RecentTransactionsService = {

  // ── Paginated transaction list ───────────────────────────────
  getTransactions: async (options?: {
    pageSize?: number;
    cursor?: string;
    search?: string;
    includeSummary?: boolean;
    includeSearchCount?: boolean;
  }) => {
    const lenderId = getLenderId();
    const params = new URLSearchParams({ lenderId });
    if (options?.pageSize)                   params.append('pageSize', String(options.pageSize));
    if (options?.cursor)                     params.append('cursor', options.cursor);
    if (options?.search)                     params.append('search', options.search);
    if (options?.includeSummary === false)    params.append('includeSummary', 'false');
    if (options?.includeSearchCount === false) params.append('includeSearchCount', 'false');
    return api.get(`/recent-transactions?${params.toString()}`);
  },

  // ── Full ledger for a single loan ────────────────────────────
  getLoanLedger: async (loanId: string) => {
    const lenderId = getLenderId();
    return api.get(`/recent-transactions/loans/${loanId}?lenderId=${lenderId}`);
  },

  // ── Record an installment payment ────────────────────────────
  recordPayment: async (
    loanId: string,
    installmentId: string,
    data: { amount: number; method?: string; reference?: string },
  ) => {
    const lenderId = getLenderId();
    return api.post(
      `/recent-transactions/loans/${loanId}/installments/${installmentId}/payments?lenderId=${lenderId}`,
      data,
    );
  },
};

// ═══════════════════════════════════════════════════════════════
//  LENDER PROFILE  —  /lender-profile/:lenderId
// ═══════════════════════════════════════════════════════════════
export const LenderProfileService = {

  // ── Get profile ──────────────────────────────────────────────
  getProfile: async () => {
    const lenderId = getLenderId();
    return api.get(`/lender-profile/${lenderId}`);
  },

  // ── Update profile ───────────────────────────────────────────
  updateProfile: async (data: {
    fullName?: string;
    email?: string;
    phone?: string;
    address?: string;
    city?: string;
    district?: string;
    businessName?: string;
    responseTimeHours?: number;
    preferredRegions?: string[];
  }) => {
    const lenderId = getLenderId();
    return api.patch(`/lender-profile/${lenderId}`, data);
  },
};

// ═══════════════════════════════════════════════════════════════
//  LENDER SETTINGS  —  /lender-settings/:lenderId
// ═══════════════════════════════════════════════════════════════
export const LenderSettingsService = {

  // ── Get settings ─────────────────────────────────────────────
  getSettings: async () => {
    const lenderId = getLenderId();
    return api.get(`/lender-settings/${lenderId}`);
  },

  // ── Update settings (partial — any section) ──────────────────
  updateSettings: async (data: {
    notifications?: Partial<{
      inAppNewRequests: boolean;
      emailNewRequests: boolean;
      inAppTransactions: boolean;
      emailTransactions: boolean;
      inAppStatusUpdates: boolean;
      emailStatusUpdates: boolean;
      inAppOverdues: boolean;
      emailOverdues: boolean;
      inAppAdExpiry: boolean;
      emailAdExpiry: boolean;
      inAppDisputes: boolean;
      emailDisputes: boolean;
    }>;
    lendingDefaults?: Partial<{
      defaultInterestRate: number;
      defaultMaxTenureMonths: number;
      defaultMinAmount: number;
      defaultMaxAmount: number;
      preferredPurposes: string[];
      preferredRegions: string[];
      defaultResponseTimeHours: number;
    }>;
    workspace?: Partial<{
      defaultLandingPage: 'dashboard' | 'analytics';
      defaultAnalyticsRange: '30d' | '90d' | '365d';
      pendingRequestsPageSize: number;
      borrowerTablePageSize: number;
    }>;
  }) => {
    const lenderId = getLenderId();
    return api.patch(`/lender-settings/${lenderId}`, data);
  },
};

// ═══════════════════════════════════════════════════════════════
//  LENDER NOTIFICATIONS  —  /lender-notifications/*
// ═══════════════════════════════════════════════════════════════
export const LenderNotificationsService = {

  // ── Unread count + category summary ─────────────────────────
  getSummary: async () => {
    const lenderId = getLenderId();
    return api.get(`/lender-notifications/summary?lenderId=${lenderId}`);
  },

  // ── Paginated notification list ──────────────────────────────
  getNotifications: async (options?: {
    category?: string;
    state?: 'read' | 'unread' | 'all';
    pageSize?: number;
    cursor?: string;
  }) => {
    const lenderId = getLenderId();
    const params = new URLSearchParams({ lenderId });
    if (options?.category)  params.append('category', options.category);
    if (options?.state)     params.append('state', options.state);
    if (options?.pageSize)  params.append('pageSize', String(options.pageSize));
    if (options?.cursor)    params.append('cursor', options.cursor);
    return api.get(`/lender-notifications?${params.toString()}`);
  },

  // ── Mark a single notification as read ──────────────────────
  markAsRead: async (notificationId: string) => {
    const lenderId = getLenderId();
    return api.patch(`/lender-notifications/${notificationId}/read`, { lenderId });
  },

  // ── Mark all (optionally filtered) notifications as read ─────
  markAllAsRead: async (options?: { category?: string; state?: 'read' | 'unread' | 'all' }) => {
    const lenderId = getLenderId();
    const params = new URLSearchParams({ lenderId });
    if (options?.category) params.append('category', options.category);
    if (options?.state)    params.append('state', options.state);
    return api.patch(`/lender-notifications/mark-all-read?${params.toString()}`);
  },
};
