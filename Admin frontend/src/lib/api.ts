import { clearAdminSession, getAdminToken } from "./auth";

const API_BASE_URL = "http://localhost:3000";

type ApiOptions = RequestInit & {
  auth?: boolean;
};

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
    role: string;
  };
}

export interface AdminUser {
  id: string;
  email: string;
  role: string;
  status?: string;
  firstName?: string;
  lastName?: string;
  createdAt?: { _seconds?: number };
  updatedAt?: { _seconds?: number };
  suspendedAt?: { _seconds?: number };
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
  submittedAt?: { _seconds?: number };
  reviewedAt?: { _seconds?: number };
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
  status: "pending" | "approved" | "rejected" | "active" | "closed";
  createdAt?: { _seconds?: number };
  reviewedAt?: { _seconds?: number };
  approvedAt?: { _seconds?: number };
  rejectedAt?: { _seconds?: number };
  rejectionReason?: string;
  notes?: string;
  updatedAt?: { _seconds?: number };
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
  targetType: "user" | "ad" | "system" | "report";
  dateTime: string;
  severity: "info" | "warning" | "critical" | "success";
}

export interface AuditLogsResponse {
  success: boolean;
  count: number;
  logs: AuditLogEntry[];
}

export function adminLogin(email: string, password: string) {
  return apiRequest<AdminAuthResponse>("/auth/admin/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
}

export function getDashboardAnalytics() {
  return apiRequest<DashboardAnalyticsResponse>("/admin/analytics/dashboard", {
    auth: true,
  });
}

export function getUsers(params?: { search?: string; role?: string; status?: string }) {
  const searchParams = new URLSearchParams();

  if (params?.search) searchParams.set("search", params.search);
  if (params?.role && params.role !== "all") searchParams.set("role", params.role);
  if (params?.status && params.status !== "all") searchParams.set("status", params.status);

  const query = searchParams.toString();
  return apiRequest<UsersResponse>(`/admin/users${query ? `?${query}` : ""}`, {
    auth: true,
  });
}

export function getUserStats() {
  return apiRequest<UserStatsResponse>("/admin/users/stats", {
    auth: true,
  });
}

export function suspendUser(userId: string, reason?: string) {
  return apiRequest("/admin/users/suspend", {
    method: "POST",
    auth: true,
    body: JSON.stringify({ userId, reason }),
  });
}

export function activateUser(userId: string) {
  return apiRequest("/admin/users/activate", {
    method: "POST",
    auth: true,
    body: JSON.stringify({ userId }),
  });
}

export function getPendingKyc() {
  return apiRequest<KycPendingResponse>("/admin/kyc/pending", {
    auth: true,
  });
}

export function approveKyc(documentId: string, notes = "Approved by admin") {
  return apiRequest(`/admin/kyc/${documentId}/approve`, {
    method: "POST",
    auth: true,
    body: JSON.stringify({ notes }),
  });
}

export function rejectKyc(documentId: string, reason = "Rejected by admin") {
  return apiRequest(`/admin/kyc/${documentId}/reject`, {
    method: "POST",
    auth: true,
    body: JSON.stringify({ reason }),
  });
}

export function getUsersReport() {
  return apiRequest<UsersReportResponse>("/admin/reports/users", {
    auth: true,
  });
}

export function getLoansReport() {
  return apiRequest<LoansReportResponse>("/admin/reports/loans", {
    auth: true,
  });
}

export function getTransactionsReport() {
  return apiRequest<TransactionsReportResponse>("/admin/reports/transactions", {
    auth: true,
  });
}

export function getRevenueReport() {
  return apiRequest<RevenueReportResponse>("/admin/reports/revenue", {
    auth: true,
  });
}

export function getAds() {
  return apiRequest<AdsResponse>("/admin/ads", {
    auth: true,
  });
}

export function approveAd(adId: string, notes = "Approved by admin") {
  return apiRequest(`/admin/ads/${adId}/approve`, {
    method: "POST",
    auth: true,
    body: JSON.stringify({ notes }),
  });
}

export function rejectAd(adId: string, reason = "Rejected by admin") {
  return apiRequest(`/admin/ads/${adId}/reject`, {
    method: "POST",
    auth: true,
    body: JSON.stringify({ reason }),
  });
}

export function getAuditLogs() {
  return apiRequest<AuditLogsResponse>("/admin/audit-logs", {
    auth: true,
  });
}
