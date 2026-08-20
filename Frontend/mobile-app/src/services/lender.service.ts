/**
 * lender.service.ts
 * 

 * Centralised service layer for all Lender screens.
 *
 * The shared auth layer in api.ts owns the access token. Canonical lender
 * endpoints derive ownership from the verified JWT rather than request input.
 *
 * Backend routes consumed (global prefix: /api):
 *   GET  /dashboard/summary?lenderId=                       → DashboardService.getSummary
 *   GET  /dashboard/borrowers?lenderId=&pageSize=           → DashboardService.getBorrowers
 *   GET  /loan-requests/pending?lenderId=&...               → LoanRequestsService.getPendingRequests
 *   GET  /payments?lenderId=&pageSize=                      → PaymentsService.getTransactions
 *   GET  /payments/loans/:id?lenderId=                      → PaymentsService.getLoanLedger
 *   GET  /analytics/summary?lenderId=&range=                → AnalyticsService.getSummary
 *   GET  /lender-profile/:lenderId                          → LenderProfileService.getProfile
 *   PATCH /lender-profile/:lenderId                         → LenderProfileService.updateProfile
 *   POST  /loan-requests/:id/decision                       → LoanRequestsService.decideRequest
 *   GET  /lender-mobile/payment-reminders                   → PaymentRemindersService.getReminders
 *
 * @format
 */

import { api, getCurrentUserId } from "./api";

export const setLenderId = (_id: string) => {
  // Compatibility no-op: the shared auth layer now owns the current user id.
};

const getLenderId = (): string => getCurrentUserId();

// Types 


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

// DashboardService 


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

// LoanRequestsService 


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
   * POST /api/loan-requests/:appId/decision
   */
  approveRequest: async (appId: string, notes?: string) => {
    return api.post<{
      requestId: string;
      status: "converted";
      updatedAt: string;
      loanId: string;
      agreementId: string;
    }>(`/loan-requests/${appId}/decision`, {
      decision: "approve",
      note: notes,
    });
  },

  /**
   * Reject a loan request.
   * POST /api/loan-requests/:appId/decision
   */
  rejectRequest: async (appId: string, reason: string) => {
    return api.post(`/loan-requests/${appId}/decision`, {
      decision: "reject",
      note: reason,
    });
  },
};

// PaymentsService 


export const PaymentsService = {
  /**
   * Fetch the lender's active loans / recent transactions list.
   * GET /api/payments?lenderId=&pageSize=
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
    return api.get(`/payments?${params.toString()}`);
  },

  /**
   * Fetch full ledger details for a specific loan.
   * GET /api/payments/loans/:loanId?lenderId=
   */
  getLoanLedger: async (loanId: string) => {
    return api.get(`/payments/loans/${loanId}`);
  },

  recordInstallmentPayment: async (
    loanId: string,
    installmentId: string,
    amount: number,
    note?: string,
  ) =>
    api.post(
      `/payments/loans/${loanId}/installments/${installmentId}/payments`,
      { amount, note: note?.trim() || null },
    ),
};

export interface LenderLoan {
  id: string;
  applicationId: string | null;
  listingId: string | null;
  borrower: { id: string; fullName: string; email: string };
  currency: string;
  principal: number;
  totalRepayable: number;
  monthlyInstallment: number;
  amountPaid: number;
  remainingBalance: number;
  annualInterestRate: number;
  tenureMonths: number;
  status: string;
  disbursedAt: string | null;
  maturityDate: string | null;
  createdAt: string | null;
  installmentProgress: {
    total: number;
    paid: number;
    overdue: number;
    nextDueAt: string | null;
  };
}

export const LenderLoansService = {
  getLoans: async (opts: {
    pageSize?: number;
    cursor?: string;
    status?: string;
    search?: string;
  } = {}): Promise<{ loans: LenderLoan[]; summary: any; pageInfo: any }> => {
    const params = new URLSearchParams();
    if (opts.pageSize) params.append("pageSize", String(opts.pageSize));
    if (opts.cursor) params.append("cursor", opts.cursor);
    if (opts.status) params.append("status", opts.status);
    if (opts.search) params.append("search", opts.search);
    const query = params.toString();
    return api.get(`/lender/loans${query ? `?${query}` : ""}`);
  },
};

// AnalyticsService 


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

// LenderProfileService 


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

// PaymentRemindersService 


export const PaymentRemindersService = {
  /**
   * Fetch upcoming payment reminders for the lender's active loans.
   * GET /api/lender-mobile/payment-reminders?lenderId=
   */
  getReminders: async () => {
    return api.get(`/lender-mobile/payment-reminders`);
  },
};

export const QrPaymentService = {
  recordPayment: async (qrData: string) =>
    api.post("/lender-mobile/qr-scanner/scan-payment", { qrData }),
};
