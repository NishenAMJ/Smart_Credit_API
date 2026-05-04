/**
 * lender.service.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Centralised service layer for all Lender screens.
 *
 * Auth pattern mirrors advertisement.service.ts:
 *   - The shared auth layer in api.ts owns the current user id.
 *   - Every request embeds lenderId as a query-param so the backend can scope data
 *   - x-user-id header is also sent by api.ts automatically
 *
 * Backend routes consumed (global prefix: /api):
 *   GET  /dashboard/summary?lenderId=                       → DashboardService.getSummary
 *   GET  /dashboard/borrowers?lenderId=&pageSize=           → DashboardService.getBorrowers
 *   GET  /loan-requests/pending?lenderId=&...               → LoanRequestsService.getPendingRequests
 *   GET  /recent-transactions?lenderId=&pageSize=           → RecentTransactionsService.getTransactions
 *   GET  /recent-transactions/loans/:id?lenderId=           → RecentTransactionsService.getLoanLedger
 *   GET  /analytics/summary?lenderId=&range=                → AnalyticsService.getSummary
 *   GET  /lender-profile/:lenderId                          → LenderProfileService.getProfile
 *   PATCH /lender-profile/:lenderId                         → LenderProfileService.updateProfile
 *   GET  /lender/:lenderId/offers                           → LoanOffersService.getMyOffers
 *   POST  /lender-mobile/offers?lenderId=                   → LoanOffersService.createOffer
 *   PATCH /lender-mobile/offers/:id?lenderId=               → LoanOffersService.updateOffer
 *   POST  /lender-mobile/loan-requests/:id/approve?lenderId → LoanRequestsService.approveRequest
 *   POST  /lender-mobile/loan-requests/:id/reject?lenderId  → LoanRequestsService.rejectRequest
 *   GET  /lender-mobile/payment-reminders?lenderId=         → PaymentRemindersService.getReminders
 *
 * @format
 */

import { api, getCurrentUserId } from "./api";

export const setLenderId = (_id: string) => {
  // Compatibility no-op: the shared auth layer now owns the current user id.
};

const getLenderId = (): string => getCurrentUserId();

// ── Types ─────────────────────────────────────────────────────────────────────

export interface LenderProfile {
  id: string;
  fullName: string;
  email: string;
  phone: string;
  address?: string;
  city?: string;
  district?: string;
  businessName?: string;
  responseTimeHours?: number;
  preferredRegions?: string[];
  status?: string;
  createdAt?: string;
  totalLoaned?: number;
  totalReturned?: number;
}

export interface UpdateProfilePayload {
  fullName?: string;
  email?: string;
  phone?: string;
  address?: string;
  city?: string;
  district?: string;
  businessName?: string;
  responseTimeHours?: number;
  preferredRegions?: string[];
}

export interface ChangePasswordPayload {
  currentPassword: string;
  newPassword: string;
}

// ── DashboardService ──────────────────────────────────────────────────────────

export const DashboardService = {
  /**
   * Fetch aggregated summary stats for the lender dashboard.
   * GET /api/dashboard/summary?lenderId=
   */
  getSummary: async (): Promise<any> => {
    const lenderId = getLenderId();
    return api.get(`/dashboard/summary?lenderId=${lenderId}`);
  },

  /**
   * Fetch the lender's borrowers list.
   * GET /api/dashboard/borrowers?lenderId=&pageSize=
   */
  getBorrowers: async (
    pageSize = 20,
    cursor?: string,
  ): Promise<{ borrowers: any[] }> => {
    const lenderId = getLenderId();
    const params = new URLSearchParams({
      lenderId,
      pageSize: String(pageSize),
    });
    if (cursor) params.append("cursor", cursor);
    return api.get(`/dashboard/borrowers?${params.toString()}`);
  },

  /**
   * Fetch a single borrower's detail view.
   * GET /api/dashboard/borrowers/:id?lenderId=
   */
  getBorrowerDetails: async (borrowerId: string) => {
    const lenderId = getLenderId();
    return api.get(`/dashboard/borrowers/${borrowerId}?lenderId=${lenderId}`);
  },
};

// ── LoanRequestsService ───────────────────────────────────────────────────────

export const LoanRequestsService = {
  /**
   * Get pending (and optionally all-status) loan requests visible to this lender.
   * GET /api/loan-requests/pending?lenderId=&pageSize=&includeAllStatuses=
   */
  getPendingRequests: async (
    opts: {
      pageSize?: number;
      cursor?: string;
      adId?: string;
      includeAllStatuses?: boolean;
    } = {},
  ): Promise<{ requests: any[] }> => {
    const lenderId = getLenderId();
    const params = new URLSearchParams({ lenderId });
    if (opts.pageSize) params.append("pageSize", String(opts.pageSize));
    if (opts.cursor) params.append("cursor", opts.cursor);
    if (opts.adId) params.append("adId", opts.adId);
    if (opts.includeAllStatuses) params.append("includeAllStatuses", "true");
    return api.get(`/loan-requests/pending?${params.toString()}`);
  },

  /**
   * Approve a loan request.
   * POST /api/lender-mobile/loan-requests/:appId/approve?lenderId=
   */
  approveRequest: async (appId: string, notes?: string) => {
    const lenderId = getLenderId();
    return api.post(
      `/lender-mobile/loan-requests/${appId}/approve?lenderId=${lenderId}`,
      notes ? { notes } : undefined,
    );
  },

  /**
   * Reject a loan request.
   * POST /api/lender-mobile/loan-requests/:appId/reject?lenderId=
   */
  rejectRequest: async (appId: string, reason: string) => {
    const lenderId = getLenderId();
    return api.post(
      `/lender-mobile/loan-requests/${appId}/reject?lenderId=${lenderId}`,
      { reason },
    );
  },
};

// ── RecentTransactionsService ─────────────────────────────────────────────────

export const RecentTransactionsService = {
  /**
   * Fetch the lender's active loans / recent transactions list.
   * GET /api/recent-transactions?lenderId=&pageSize=
   */
  getTransactions: async (
    opts: {
      pageSize?: number;
      cursor?: string;
      search?: string;
    } = {},
  ): Promise<{ transactions: any[]; summary?: any }> => {
    const lenderId = getLenderId();
    const params = new URLSearchParams({ lenderId });
    if (opts.pageSize) params.append("pageSize", String(opts.pageSize));
    if (opts.cursor) params.append("cursor", opts.cursor);
    if (opts.search) params.append("search", opts.search);
    return api.get(`/recent-transactions?${params.toString()}`);
  },

  /**
   * Fetch full ledger details for a specific loan.
   * GET /api/recent-transactions/loans/:loanId?lenderId=
   */
  getLoanLedger: async (loanId: string) => {
    const lenderId = getLenderId();
    return api.get(`/recent-transactions/loans/${loanId}?lenderId=${lenderId}`);
  },
};

// ── AnalyticsService ──────────────────────────────────────────────────────────

export const AnalyticsService = {
  /**
   * Fetch analytics summary for a given time range.
   * GET /api/analytics/summary?lenderId=&range=
   */
  getSummary: async (range: "30d" | "90d" | "365d" = "90d") => {
    const lenderId = getLenderId();
    return api.get(`/analytics/summary?lenderId=${lenderId}&range=${range}`);
  },
};

// ── LenderProfileService ──────────────────────────────────────────────────────

export const LenderProfileService = {
  /**
   * Fetch the current lender's profile.
   * GET /api/lender-profile/:lenderId
   */
  getProfile: async (): Promise<LenderProfile> => {
    const lenderId = getLenderId();
    return api.get(`/lender-profile/${lenderId}`);
  },

  /**
   * Update editable profile fields.
   * PATCH /api/lender-profile/:lenderId
   */
  updateProfile: async (
    payload: UpdateProfilePayload,
  ): Promise<LenderProfile> => {
    const lenderId = getLenderId();
    return api.patch(`/lender-profile/${lenderId}`, payload);
  },

  /**
   * Change password.
   * ⚠️ Backend endpoint not yet implemented. Throws to surface a proper error.
   */
  changePassword: async (_payload: ChangePasswordPayload): Promise<void> => {
    throw new Error(
      "changePassword endpoint not yet implemented on the backend.",
    );
  },
};

// ── LoanOffersService ─────────────────────────────────────────────────────────

export const LoanOffersService = {
  /**
   * Fetch this lender's own loan offers.
   * GET /api/lender/:lenderId/offers
   */
  getMyOffers: async (): Promise<{ offers: any[] }> => {
    const lenderId = getLenderId();
    return api.get(`/lender/${lenderId}/offers`);
  },

  /**
   * Create a new loan offer.
   * POST /api/lender-mobile/offers?lenderId=
   */
  createOffer: async (data: {
    loanType: string;
    minAmount: number;
    maxAmount: number;
    interestRate: number;
    tenureMonths: number;
    active: boolean;
  }) => {
    const lenderId = getLenderId();
    return api.post(`/lender-mobile/offers?lenderId=${lenderId}`, data);
  },

  /**
   * Update an existing loan offer.
   * PATCH /api/lender-mobile/offers/:offerId?lenderId=
   */
  updateOffer: async (
    offerId: string,
    data: {
      minAmount?: number;
      maxAmount?: number;
      interestRate?: number;
      tenureMonths?: number;
      active?: boolean;
    },
  ) => {
    const lenderId = getLenderId();
    return api.patch(
      `/lender-mobile/offers/${offerId}?lenderId=${lenderId}`,
      data,
    );
  },
};

// ── PaymentRemindersService ───────────────────────────────────────────────────

export const PaymentRemindersService = {
  /**
   * Fetch upcoming payment reminders for the lender's active loans.
   * GET /api/lender-mobile/payment-reminders?lenderId=
   */
  getReminders: async () => {
    const lenderId = getLenderId();
    return api.get(`/lender-mobile/payment-reminders?lenderId=${lenderId}`);
  },
};
