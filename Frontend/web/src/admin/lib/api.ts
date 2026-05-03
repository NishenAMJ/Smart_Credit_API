import { clearAdminSession, getAdminToken } from "./auth";
import {
  DEFAULT_AD_APPROVAL_NOTE,
  DEFAULT_AD_REJECTION_REASON,
  DEFAULT_KYC_APPROVAL_NOTE,
  DEFAULT_KYC_REJECTION_REASON,
} from "../constants/admin-actions";
import type { AdminAuthResponse } from "../types/admin-auth";

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ?? "http://localhost:3000/api";
export const LENDER_APP_URL = import.meta.env.VITE_LENDER_APP_URL ?? "/lender";

export type FirestoreTimestamp = { _seconds?: number };
export type AdminUserRole = "admin" | "borrower" | "lender";
export type AdminUserStatus = "active" | "pending" | "suspended" | "inactive";
export type AuditSeverity = "info" | "warning" | "critical" | "success";
export type AuditTargetType = "user" | "ad" | "system" | "report";
export type AdStatus = "pending" | "approved" | "rejected" | "active" | "closed";
export type WebLoginRole = "admin" | "lender";
export type PublicSignupRole = "borrower" | "lender";
export type SubmitKycPayload = {
  documentType: string;
  documentNumber: string;
  fullName: string;
  issuingCountry?: string;
  expiryDate?: string;
  documentFrontUrl?: string;
  documentBackUrl?: string;
  selfieUrl?: string;
};

export function getApiBaseUrl() {
  return API_BASE_URL;
}

type ApiOptions = RequestInit & {
  auth?: boolean;
};

// Centralizes request setup so auth handling and JSON parsing stay consistent across pages.
async function apiRequest<T>(path: string, options: ApiOptions = {}): Promise<T> {
  const headers = new Headers(options.headers);

  if (!headers.has("Content-Type") && options.body) {
    headers.set("Content-Type", "application/json");
  }

  if (options.auth) {
    const token = getAdminToken();

    if (!token) {
      throw new Error("You are not signed in.");
    }

    headers.set("Authorization", `Bearer ${token}`);
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers,
  });

  const text = await response.text();
  const data = text ? JSON.parse(text) : null;

  if (!response.ok) {
    if (response.status === 401) {
      clearAdminSession();
    }

    throw new Error(data?.message || "Request failed");
  }

  return data as T;
}

export interface AdminSignupRequest {
  fullName: string;
  email: string;
  phone: string;
  password: string;
  role: PublicSignupRole;
}

export interface AdminUser {
  id: string;
  uid?: string;
  email: string;
  role: AdminUserRole;
  status?: AdminUserStatus;
  fullName?: string;
  firstName?: string;
  lastName?: string;
  phone?: string;
  photoURL?: string;
  creditScore?: number;
  rating?: number;
  totalLoansCompleted?: number;
  totalAmountLent?: number;
  totalAmountBorrowed?: number;
  kycStatus?: "approved" | "pending" | "rejected";
  createdAt?: FirestoreTimestamp;
  updatedAt?: FirestoreTimestamp;
  suspendedAt?: FirestoreTimestamp;
  suspensionReason?: string;
}

export interface UserStatsResponse {
  success: boolean;
  stats: {
    totalUsers: number;
    activeUsers: number;
    suspendedUsers: number;
    pendingUsers: number;
    admins: number;
    borrowers: number;
    lenders: number;
  };
}

export interface PaginationMeta {
  hasMore?: boolean;
  nextCursor?: string;
}

export interface UsersResponse {
  success: boolean;
  count: number;
  users: AdminUser[];
}

export interface KycDocument {
  id: string;
  userId: string;
  fullName?: string;
  email?: string;
  phone?: string;
  documentType: string;
  documentUrl?: string;
  status: "pending" | "approved" | "rejected";
  submittedAt?: FirestoreTimestamp;
  reviewedAt?: FirestoreTimestamp;
  reviewedBy?: string;
  rejectionReason?: string;
  notes?: string;
}

export interface KycPendingResponse {
  success: boolean;
  count: number;
  documents: KycDocument[];
}

export interface DashboardAnalyticsResponse {
  success: boolean;
  data: {
    overview: {
      totalUsers: number;
      totalLoans: number;
      totalRevenue: number;
      activeDisputes: number;
    };
    recentActivity: {
      newUsersToday: number;
      loansCreatedToday: number;
      transactionsToday: number;
      disputesResolvedToday: number;
    };
    trends: {
      userGrowthRate: number;
      loanGrowthRate: number;
      revenueGrowthRate: number;
      disputeResolutionRate: number;
    };
    alerts: Array<{
      type: "warning" | "error" | "info";
      message: string;
      count: number;
    }>;
  };
}

export interface UsersReportResponse {
  success: boolean;
  data: {
    totalUsers: number;
    activeUsers: number;
    suspendedUsers: number;
    borrowers: number;
    lenders: number;
    newUsersThisMonth: number;
    usersByRole: {
      admin: number;
      borrower: number;
      lender: number;
    };
    usersByStatus: {
      active: number;
      suspended: number;
    };
  };
}

export interface LoansReportResponse {
  success: boolean;
  data: {
    totalLoans: number;
    activeLoans: number;
    completedLoans: number;
    defaultedLoans: number;
    totalLoanAmount: number;
    averageLoanAmount: number;
    pendingApprovals: number;
    loansByStatus: Record<string, number>;
  };
}

export interface TransactionsReportResponse {
  success: boolean;
  data: {
    totalTransactions: number;
    successfulTransactions: number;
    failedTransactions: number;
    pendingTransactions: number;
    totalTransactionVolume: number;
    averageTransactionAmount: number;
    transactionsByType: Record<string, number>;
  };
}

export interface AdminTransaction {
  id: string;
  transactionId: string;
  loanId?: string;
  lenderId?: string;
  lenderName?: string;
  lenderEmail?: string;
  borrowerId?: string;
  borrowerName?: string;
  borrowerEmail?: string;
  amount: number;
  platformFee: number;
  paymentType: string;
  status: string;
  verifiedByLender: boolean;
  createdAt?: string;
  paidAt?: string;
  updatedAt?: string;
}

export interface TransactionsResponse {
  success: boolean;
  count: number;
  totalAmount: number;
  transactions: AdminTransaction[];
  error?: string;
}

export interface RevenueReportResponse {
  success: boolean;
  data: {
    totalRevenue: number;
    monthlyRevenue: number;
    revenueThisYear: number;
    platformFees: number;
    interestRevenue: number;
    revenueGrowth: number;
    revenueByMonth: Array<{
      month: string;
      revenue: number;
    }>;
  };
}

export interface AdminAd {
  id: string;
  adId?: string;
  lenderId: string;
  lenderName?: string;
  lenderPhotoURL?: string;
  lenderRating?: number;
  maxAmount?: number;
  preferredInterestRate?: number;
  minTenureMonths?: number;
  maxTenureMonths?: number;
  preferredPurposes?: string[];
  location?: string;
  status: AdStatus;
  createdAt?: FirestoreTimestamp;
  expiresAt?: FirestoreTimestamp;
  reviewedAt?: FirestoreTimestamp;
  approvedAt?: FirestoreTimestamp;
  rejectedAt?: FirestoreTimestamp;
  rejectionReason?: string;
  notes?: string;
  updatedAt?: FirestoreTimestamp;
}

export interface AdsResponse {
  success: boolean;
  count: number;
  ads: AdminAd[];
}

export interface AdStatsResponse {
  success: boolean;
  stats: {
    all: number;
    active: number;
    approved: number;
    pending: number;
    rejected: number;
    closed: number;
  };
}

export interface AuditLogEntry {
  id: string;
  actionType:
    | "kyc_approved"
    | "kyc_rejected"
    | "user_suspended"
    | "user_activated"
    | "ad_approved"
    | "ad_rejected"
    | "report_generated"
    | "system_event";
  description: string;
  performedBy: string;
  targetName: string;
  targetType: AuditTargetType;
  dateTime: string;
  severity: AuditSeverity;
}

export interface AuditLogsResponse {
  success: boolean;
  count: number;
  logs: AuditLogEntry[];
}

export type DisputeStatus = "open" | "in-progress" | "resolved" | "escalated" | "closed";
export type DisputePriority = "low" | "medium" | "high" | "critical";
export type DisputeCategory = "payment" | "fraud" | "service" | "other";

export interface AdminDispute {
  id: string;
  disputeId?: string;
  disputeCode?: string;
  transactionId?: string;
  loanId?: string;
  lenderId?: string;
  borrowerId?: string;
  lenderName?: string;
  borrowerName?: string;
  lenderPhotoURL?: string;
  borrowerPhotoURL?: string;
  raisedBy: string;
  raisedByUserId?: string;
  raisedByRole?: "borrower" | "lender";
  againstUser: string;
  againstUserId?: string;
  againstUserRole?: "borrower" | "lender";
  title?: string;
  description: string;
  category: DisputeCategory;
  status: DisputeStatus;
  priority: DisputePriority;
  disputedAmount?: number;
  evidenceUrls?: string[];
  statusHistory?: Array<{
    status: string;
    note: string;
    at?: FirestoreTimestamp;
    by: string;
  }>;
  createdAt?: FirestoreTimestamp;
  updatedAt?: FirestoreTimestamp;
  resolvedAt?: FirestoreTimestamp;
  resolution?: string;
  escalatedAt?: FirestoreTimestamp;
  escalationReason?: string;
  notes?: string;
  assignedTo?: string;
}

export interface DisputesResponse {
  success: boolean;
  count: number;
  disputes: AdminDispute[];
}

export type CursorQueryParams = {
  limit?: number;
  cursor?: string;
};

// Keeps login calls typed so the calling page can store the session safely.
export function loginWithRole(
  identifier: string,
  password: string,
  role?: WebLoginRole,
) {
  return apiRequest<AdminAuthResponse>("/auth/login", {
    method: "POST",
    body: JSON.stringify({
      identifier,
      password,
      ...(role ? { role } : {}),
    }),
  });
}

export function registerPublicUser(payload: AdminSignupRequest) {
  return apiRequest<{
    message: string;
    user: AdminAuthResponse["user"];
  }>("/auth/register", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function submitKyc(accessToken: string, payload: SubmitKycPayload) {
  return apiRequest<{
    message: string;
    submission: {
      status: "not_submitted" | "pending" | "under_review" | "approved" | "rejected";
    };
  }>("/kyc/submit", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify(payload),
  });
}

// Keeps dashboard pages independent from raw fetch configuration.
export function getDashboardAnalytics() {
  return apiRequest<DashboardAnalyticsResponse>("/admin/analytics/dashboard", {
    auth: true,
  });
}

export type UserQueryParams = {
  search?: string;
  role?: AdminUser["role"] | "all";
  status?: NonNullable<AdminUser["status"]> | "all";
};

// Encapsulates user filters so pages do not have to assemble query strings manually.
export function getUsers(params?: UserQueryParams & CursorQueryParams) {
  const searchParams = new URLSearchParams();

  if (params?.search) searchParams.set("search", params.search);
  if (params?.role && params.role !== "all") searchParams.set("role", params.role);
  if (params?.status && params.status !== "all") searchParams.set("status", params.status);
  if (typeof params?.limit === "number") searchParams.set("limit", String(params.limit));
  if (params?.cursor) searchParams.set("cursor", params.cursor);

  const query = searchParams.toString();
  return apiRequest<UsersResponse & PaginationMeta>(`/admin/users${query ? `?${query}` : ""}`, {
    auth: true,
  });
}

// Separates aggregate dashboard data from the full user list request.
export function getUserStats() {
  return apiRequest<UserStatsResponse>("/admin/users/stats", {
    auth: true,
  });
}

// Keeps the user moderation request shape in one place for reuse.
export function suspendUser(userId: string, reason?: string) {
  return apiRequest("/admin/users/suspend", {
    method: "POST",
    auth: true,
    body: JSON.stringify({ userId, reason }),
  });
}

// Keeps reactivation logic out of page components.
export function activateUser(userId: string) {
  return apiRequest("/admin/users/activate", {
    method: "POST",
    auth: true,
    body: JSON.stringify({ userId }),
  });
}

// Gives the KYC page a single typed entry point for review data.
export function getPendingKyc(params?: CursorQueryParams) {
  const searchParams = new URLSearchParams();
  if (typeof params?.limit === "number") searchParams.set("limit", String(params.limit));
  if (params?.cursor) searchParams.set("cursor", params.cursor);
  const query = searchParams.toString();
  return apiRequest<KycPendingResponse & PaginationMeta>(`/admin/kyc/pending${query ? `?${query}` : ""}`, {
    auth: true,
  });
}

// Uses a shared default note so approval messages stay consistent.
export function approveKyc(
  documentId: string,
  notes = DEFAULT_KYC_APPROVAL_NOTE,
) {
  return apiRequest(`/admin/kyc/${documentId}/approve`, {
    method: "POST",
    auth: true,
    body: JSON.stringify({ notes }),
  });
}

// Uses a shared default reason so rejection messages stay consistent.
export function rejectKyc(
  documentId: string,
  reason = DEFAULT_KYC_REJECTION_REASON,
) {
  return apiRequest(`/admin/kyc/${documentId}/reject`, {
    method: "POST",
    auth: true,
    body: JSON.stringify({ reason }),
  });
}

// Keeps report-fetching logic consistent across reporting pages.
export function getUsersReport() {
  return apiRequest<UsersReportResponse>("/admin/reports/users", {
    auth: true,
  });
}

// Keeps report-fetching logic consistent across reporting pages.
export function getLoansReport() {
  return apiRequest<LoansReportResponse>("/admin/reports/loans", {
    auth: true,
  });
}

// Keeps report-fetching logic consistent across reporting pages.
export function getTransactionsReport() {
  return apiRequest<TransactionsReportResponse>("/admin/reports/transactions", {
    auth: true,
  });
}

export function getTransactions(limit = 25, cursor?: string) {
  const searchParams = new URLSearchParams();
  searchParams.set("limit", String(limit));
  if (cursor) searchParams.set("cursor", cursor);
  return apiRequest<TransactionsResponse & PaginationMeta>(`/admin/transactions?${searchParams.toString()}`, {
    auth: true,
  });
}

export function subscribeToTransactions(
  onMessage: (payload: TransactionsResponse) => void,
  onError?: () => void,
  limit = 100,
) {
  const token = getAdminToken();

  if (!token) {
    throw new Error("You are not signed in.");
  }

  const url = new URL(`${API_BASE_URL}/admin/transactions/stream`);
  url.searchParams.set("token", token);
  url.searchParams.set("limit", String(limit));

  const source = new EventSource(url.toString());

  source.onmessage = (event) => {
    onMessage(JSON.parse(event.data) as TransactionsResponse);
  };

  source.onerror = () => {
    onError?.();
  };

  return source;
}

// Keeps report-fetching logic consistent across reporting pages.
export function getRevenueReport() {
  return apiRequest<RevenueReportResponse>("/admin/reports/revenue", {
    auth: true,
  });
}

// Gives the ads page a typed moderation data source.
export function getAds(params?: CursorQueryParams) {
  const searchParams = new URLSearchParams();
  if (typeof params?.limit === "number") searchParams.set("limit", String(params.limit));
  if (params?.cursor) searchParams.set("cursor", params.cursor);
  const query = searchParams.toString();
  return apiRequest<AdsResponse & PaginationMeta>(`/admin/ads${query ? `?${query}` : ""}`, {
    auth: true,
  });
}

export function getAdStats() {
  return apiRequest<AdStatsResponse>("/admin/ads/stats", {
    auth: true,
  });
}

// Uses a shared approval note so moderation actions are predictable.
export function approveAd(adId: string, notes = DEFAULT_AD_APPROVAL_NOTE) {
  return apiRequest(`/admin/ads/${adId}/approve`, {
    method: "POST",
    auth: true,
    body: JSON.stringify({ notes }),
  });
}

// Uses a shared rejection reason so moderation actions are predictable.
export function rejectAd(adId: string, reason = DEFAULT_AD_REJECTION_REASON) {
  return apiRequest(`/admin/ads/${adId}/reject`, {
    method: "POST",
    auth: true,
    body: JSON.stringify({ reason }),
  });
}

// Allows admins to reopen or reverse moderation after borrower complaints.
export function updateAdStatus(
  adId: string,
  status: Extract<AdStatus, "pending" | "approved" | "rejected">,
  options: { reason?: string; notes?: string } = {},
) {
  return apiRequest(`/admin/ads/${adId}/status`, {
    method: "PATCH",
    auth: true,
    body: JSON.stringify({ status, ...options }),
  });
}

// Keeps audit pages isolated from raw request details.
export function getAuditLogs(params?: CursorQueryParams) {
  const searchParams = new URLSearchParams();
  if (typeof params?.limit === "number") searchParams.set("limit", String(params.limit));
  if (params?.cursor) searchParams.set("cursor", params.cursor);
  const query = searchParams.toString();
  return apiRequest<AuditLogsResponse & PaginationMeta>(`/admin/audit-logs${query ? `?${query}` : ""}`, {
    auth: true,
  });
}

export function getDisputes(params?: CursorQueryParams) {
  const searchParams = new URLSearchParams();
  if (typeof params?.limit === "number") searchParams.set("limit", String(params.limit));
  if (params?.cursor) searchParams.set("cursor", params.cursor);
  const query = searchParams.toString();
  return apiRequest<DisputesResponse & PaginationMeta>(`/admin/disputes${query ? `?${query}` : ""}`, {
    auth: true,
  });
}

export function resolveDispute(
  disputeId: string,
  resolution = "Resolved by admin after review",
  notes?: string,
) {
  return apiRequest(`/admin/disputes/${disputeId}/resolve`, {
    method: "POST",
    auth: true,
    body: JSON.stringify({ resolution, notes }),
  });
}

export function escalateDispute(
  disputeId: string,
  reason = "Escalated by admin for further investigation",
  notes?: string,
) {
  return apiRequest(`/admin/disputes/${disputeId}/escalate`, {
    method: "POST",
    auth: true,
    body: JSON.stringify({ reason, notes }),
  });
}
