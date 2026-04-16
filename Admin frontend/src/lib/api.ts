import { clearAdminSession, getAdminToken } from "./auth";
import {
  DEFAULT_AD_APPROVAL_NOTE,
  DEFAULT_AD_REJECTION_REASON,
  DEFAULT_KYC_APPROVAL_NOTE,
  DEFAULT_KYC_REJECTION_REASON,
} from "../constants/admin-actions";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:3000";

export type FirestoreTimestamp = { _seconds?: number };
export type AdminUserRole = "admin" | "borrower" | "lender";
export type AdminUserStatus = "active" | "pending" | "suspended" | "inactive";
export type AuditSeverity = "info" | "warning" | "critical" | "success";
export type AuditTargetType = "user" | "ad" | "system" | "report";
export type AdStatus = "pending" | "approved" | "rejected" | "active" | "closed";

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

export interface AdminAuthResponse {
  accessToken: string;
  user: {
    uid: string;
    email: string;
    role: AdminUserRole;
  };
}

export interface AdminUser {
  id: string;
  email: string;
  role: AdminUserRole;
  status?: AdminUserStatus;
  firstName?: string;
  lastName?: string;
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

export interface UsersResponse {
  success: boolean;
  count: number;
  users: AdminUser[];
}

export interface KycDocument {
  id: string;
  userId: string;
  documentType: string;
  documentUrl: string;
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
  userId: string;
  title: string;
  description: string;
  amount?: number;
  interestRate?: number;
  duration?: number;
  adType: "borrower" | "lender";
  status: AdStatus;
  createdAt?: FirestoreTimestamp;
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

// Keeps login calls typed so the calling page can store the session safely.
export function adminLogin(email: string, password: string) {
  return apiRequest<AdminAuthResponse>("/auth/admin/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
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
export function getUsers(params?: UserQueryParams) {
  const searchParams = new URLSearchParams();

  if (params?.search) searchParams.set("search", params.search);
  if (params?.role && params.role !== "all") searchParams.set("role", params.role);
  if (params?.status && params.status !== "all") searchParams.set("status", params.status);

  const query = searchParams.toString();
  return apiRequest<UsersResponse>(`/admin/users${query ? `?${query}` : ""}`, {
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
export function getPendingKyc() {
  return apiRequest<KycPendingResponse>("/admin/kyc/pending", {
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

// Keeps report-fetching logic consistent across reporting pages.
export function getRevenueReport() {
  return apiRequest<RevenueReportResponse>("/admin/reports/revenue", {
    auth: true,
  });
}

// Gives the ads page a typed moderation data source.
export function getAds() {
  return apiRequest<AdsResponse>("/admin/ads", {
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

// Keeps audit pages isolated from raw request details.
export function getAuditLogs() {
  return apiRequest<AuditLogsResponse>("/admin/audit-logs", {
    auth: true,
  });
}
