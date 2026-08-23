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

export type FirestoreTimestamp = { _seconds?: number };
export type AdminUserRole = "admin" | "borrower" | "lender";
export type AdminUserStatus = "active" | "pending" | "suspended";
export type AuditSeverity = "info" | "warning" | "critical" | "success";
export type AuditTargetType = "user" | "ad" | "system" | "report";
export type AdStatus =
  | "pending"
  | "rejected"
  | "active"
  | "closed";
export type WebLoginRole = AdminUserRole;
export type PublicSignupRole = "borrower" | "lender";
export type SubmitKycPayload = {
  documentType: string;
  documentNumber: string;
  fullName: string;
  issuingCountry?: string;
  expiryDate?: string;
  nicFrontDataUrl?: string;
  nicBackDataUrl?: string;
  addressProofDataUrl?: string;
  bankDocumentDataUrl?: string;
  profilePhotoUrl?: string;
  documentFrontUrl?: string;
  documentBackUrl?: string;
  selfieUrl?: string;
  profilePictureUrl?: string;
  addressProofNumber?: string;
  bankAccountNumber?: string;
  bankName?: string;
  branchCode?: string;
  accountType?: string;
};

export function getApiBaseUrl() {
  return API_BASE_URL;
}

type ApiOptions = RequestInit & {
  auth?: boolean;
};

// Centralizes request setup so auth handling and JSON parsing stay consistent across pages.
// Sends authenticated admin requests and normalizes JSON error handling in one place.
async function apiRequest<T>(
  path: string,
  options: ApiOptions = {},
): Promise<T> {
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
  address: RegistrationAddress;
  password: string;
  role: PublicSignupRole;
}

export type RegistrationAddress = {
  line1: string;
  line2?: string;
  city: string;
  district: string;
  province: string;
};

export type RegistrationLocation = {
  latitude: number;
  longitude: number;
  city?: string;
  district?: string;
  visibility?: "hidden" | "approximate" | "exact";
};

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
  originalFilename?: string;
  documentUrl?: string;
  status: "pending" | "approved" | "rejected";
  documentStatus?:
    | "pending_review"
    | "approved"
    | "rejected"
    | "expired"
    | "deleted";
  submittedAt?: FirestoreTimestamp;
  reviewedAt?: FirestoreTimestamp;
  reviewedBy?: string;
  reviewerId?: string;
  reviewTimestamp?: FirestoreTimestamp;
  reviewNotes?: string;
  rejectionReason?: string;
  notes?: string;
  userKycStatus?: string;
  applicant?: {
    fullName: string;
    email: string;
    phone: string;
    role?: "borrower" | "lender";
    address?: RegistrationAddress;
  };
  identityDetails?: {
    documentType: string;
    documentNumber: string;
    fullName: string;
    issuingCountry?: string;
    expiryDate?: string;
  };
  location?: RegistrationLocation & {
    visibility: "hidden" | "approximate" | "exact";
    updatedAt?: FirestoreTimestamp;
  };
}

export interface KycPendingResponse {
  success: boolean;
  count: number;
  documents: KycDocument[];
  summary: {
    total: number;
    pending: number;
    approved: number;
    rejected: number;
  };
}

export interface KycDocumentAccessResponse {
  success: boolean;
  documentId: string;
  accessUrl: string;
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
    userRoles: {
      admin: number;
      borrower: number;
      lender: number;
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
  generatedAt?: string;
  cacheAgeSeconds?: number;
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
  paymentMethod?: string;
  externalReference?: string;
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
    revenueBySource?: {
      disbursementFees: number;
      adBoostCharges: number;
      otherPlatformFees: number;
      repaymentFees: number;
    } | null;
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
    pending: number;
    rejected: number;
    closed: number;
  };
}

export interface AuditLogEntry {
  id: string;
  action: string;
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
  actorId: string;
  targetName: string;
  targetId: string;
  targetType: AuditTargetType | "boost";
  dateTime: string;
  severity: AuditSeverity;
  before: unknown;
  after: unknown;
  metadata: Record<string, unknown>;
  ipAddress?: string;
  sessionId?: string;
}

export interface AuditLogsResponse {
  success: boolean;
  count: number;
  logs: AuditLogEntry[];
}

export type DisputeStatus =
  | "open"
  | "under_review"
  | "awaiting_response"
  | "resolved"
  | "escalated"
  | "closed";
export type DisputePriority = "low" | "medium" | "high" | "critical";
export type DisputeCategory =
  | "payment"
  | "loan_terms"
  | "fraud"
  | "conduct"
  | "other";

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
  escalatedAt?: FirestoreTimestamp;
  escalationReason?: string;
  notes?: string;
  assignedTo?: string;
  complainantId?: string;
  respondentId?: string;
  subject?: string;
  desiredOutcome?: string;
  disputedAmountMinor?: number | null;
  evidenceDocumentIds?: string[];
  assignedAdminId?: string | null;
  acknowledgements?: Record<string, FirestoreTimestamp>;
  reopenCount?: number;
  resolution?: {
    summary: string;
    recommendedActions: string[];
    issuedByAdminId: string;
    issuedAt: FirestoreTimestamp;
    reopenUntil: FirestoreTimestamp;
  } | null;
}

export interface DisputeEvent {
  id: string;
  type: string;
  actorUserId: string;
  actorRole: "borrower" | "lender" | "admin" | "system";
  message: string;
  documentIds: string[];
  visibility: "shared" | "admin";
  createdAt?: FirestoreTimestamp;
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

export function updateRegistrationLocation(
  accessToken: string,
  payload: RegistrationLocation,
) {
  return apiRequest<{ success: boolean }>("/location/me", {
    method: "PATCH",
    headers: { Authorization: `Bearer ${accessToken}` },
    body: JSON.stringify(payload),
  });
}

export function submitKyc(accessToken: string, payload: SubmitKycPayload) {
  return apiRequest<{
    message: string;
    submission: {
      status:
        | "not_submitted"
        | "pending"
        | "under_review"
        | "approved"
        | "rejected";
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
  if (params?.role && params.role !== "all")
    searchParams.set("role", params.role);
  if (params?.status && params.status !== "all")
    searchParams.set("status", params.status);
  if (typeof params?.limit === "number")
    searchParams.set("limit", String(params.limit));
  if (params?.cursor) searchParams.set("cursor", params.cursor);

  const query = searchParams.toString();
  return apiRequest<UsersResponse & PaginationMeta>(
    `/admin/users${query ? `?${query}` : ""}`,
    {
      auth: true,
    },
  );
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
  if (typeof params?.limit === "number")
    searchParams.set("limit", String(params.limit));
  if (params?.cursor) searchParams.set("cursor", params.cursor);
  const query = searchParams.toString();
  return apiRequest<KycPendingResponse & PaginationMeta>(
    `/admin/kyc/pending${query ? `?${query}` : ""}`,
    {
      auth: true,
    },
  );
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

export function getKycDocumentAccess(documentId: string) {
  return apiRequest<KycDocumentAccessResponse>(
    `/admin/kyc/${documentId}/access`,
    {
      auth: true,
    },
  );
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
  return apiRequest<TransactionsResponse & PaginationMeta>(
    `/admin/transactions?${searchParams.toString()}`,
    {
      auth: true,
    },
  );
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

// Persists an authenticated admin password change immediately through the backend.
export function changeAdminPassword(
  currentPassword: string,
  newPassword: string,
) {
  return apiRequest<{ message: string }>("/auth/change-password", {
    method: "POST",
    auth: true,
    body: JSON.stringify({
      currentPassword,
      newPassword,
    }),
  });
}

// Gives the ads page a typed moderation data source.
export function getAds(
  params?: CursorQueryParams & { status?: AdStatus | "all"; search?: string },
) {
  const searchParams = new URLSearchParams();
  if (typeof params?.limit === "number")
    searchParams.set("limit", String(params.limit));
  if (params?.cursor) searchParams.set("cursor", params.cursor);
  if (params?.status && params.status !== "all")
    searchParams.set("status", params.status);
  if (params?.search) searchParams.set("search", params.search);
  const query = searchParams.toString();
  return apiRequest<AdsResponse & PaginationMeta>(
    `/admin/ads${query ? `?${query}` : ""}`,
    {
      auth: true,
    },
  );
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

// Keeps audit pages isolated from raw request details.
export function getAuditLogs(params?: CursorQueryParams) {
  const searchParams = new URLSearchParams();
  if (typeof params?.limit === "number")
    searchParams.set("limit", String(params.limit));
  if (params?.cursor) searchParams.set("cursor", params.cursor);
  const query = searchParams.toString();
  return apiRequest<AuditLogsResponse & PaginationMeta>(
    `/admin/audit-logs${query ? `?${query}` : ""}`,
    {
      auth: true,
    },
  );
}

export function getDisputes(
  params?: CursorQueryParams & {
    status?: DisputeStatus;
    priority?: DisputePriority;
    assignedAdminId?: string;
    search?: string;
  },
) {
  const searchParams = new URLSearchParams();
  if (typeof params?.limit === "number")
    searchParams.set("limit", String(params.limit));
  if (params?.cursor) searchParams.set("cursor", params.cursor);
  if (params?.status) searchParams.set("status", params.status);
  if (params?.priority) searchParams.set("priority", params.priority);
  if (params?.assignedAdminId)
    searchParams.set("assignedAdminId", params.assignedAdminId);
  if (params?.search) searchParams.set("search", params.search);
  const query = searchParams.toString();
  return apiRequest<DisputesResponse & PaginationMeta>(
    `/admin/disputes${query ? `?${query}` : ""}`,
    {
      auth: true,
    },
  );
}

export function getDisputeStats() {
  return apiRequest<{
    success: boolean;
    stats: Record<string, number>;
  }>("/admin/disputes/stats", { auth: true });
}

export function getDisputeEvents(disputeId: string) {
  return apiRequest<{ success: boolean; events: DisputeEvent[] }>(
    `/admin/disputes/${disputeId}/events`,
    { auth: true },
  );
}

export function getDisputeEvidenceAccess(documentId: string) {
  return apiRequest<{
    documentId: string;
    accessUrl: string;
    expiresAt: string;
    fileName: string;
    mimeType: string;
  }>(`/documents/${documentId}/access`, { auth: true });
}

export function assignDispute(disputeId: string, adminId?: string) {
  return apiRequest(`/admin/disputes/${disputeId}/assignment`, {
    method: "PATCH",
    auth: true,
    body: JSON.stringify({ adminId }),
  });
}

export function changeDisputePriority(
  disputeId: string,
  priority: DisputePriority,
  reason: string,
) {
  return apiRequest(`/admin/disputes/${disputeId}/priority`, {
    method: "PATCH",
    auth: true,
    body: JSON.stringify({ priority, reason }),
  });
}

export function startDisputeReview(disputeId: string) {
  return apiRequest<{ success: boolean; dispute: AdminDispute }>(
    `/admin/disputes/${disputeId}/review`,
    { method: "PATCH", auth: true },
  );
}

export type AdminAdBoost = {
  boostId: string;
  listingId: string;
  lenderId: string;
  lenderName?: string;
  status: string;
  paymentMethod: "bank_transfer" | "card";
  transactionId: string;
  receiptDocumentId: string | null;
  bankReference: string | null;
  rejectionReason: string | null;
  createdAt: string | null;
  submittedAt: string | null;
  reviewedAt: string | null;
  reviewedByAdminId: string | null;
  reviewedByAdminName?: string;
  listingTitle?: string;
  startsAt: string | null;
  endsAt: string | null;
  plan: {
    id: string;
    name: string;
    durationDays: number;
    amountMinor: number;
    currency: "LKR";
  };
};

export function getAdBoosts(status = "all") {
  return apiRequest<AdminAdBoost[]>(
    `/admin/ad-boosts?status=${encodeURIComponent(status)}`,
    { auth: true },
  );
}

export function decideAdBoostPayment(
  boostId: string,
  approved: boolean,
  reason?: string,
) {
  return apiRequest<AdminAdBoost>(
    `/admin/ad-boosts/${encodeURIComponent(boostId)}/decision`,
    {
      method: "POST",
      auth: true,
      body: JSON.stringify({ approved, reason }),
    },
  );
}

export function getAdBoostReceiptAccess(documentId: string) {
  return apiRequest<{ documentId: string; accessUrl: string; expiresAt: string }>(
    `/documents/${encodeURIComponent(documentId)}/access`,
    { auth: true },
  );
}

export function addAdminDisputeComment(
  disputeId: string,
  message: string,
  visibility: "shared" | "admin",
) {
  return apiRequest(`/admin/disputes/${disputeId}/comments`, {
    method: "POST",
    auth: true,
    body: JSON.stringify({ message, visibility }),
  });
}

export function requestDisputeInformation(
  disputeId: string,
  requestedFrom: "complainant" | "respondent" | "both",
  message: string,
) {
  return apiRequest(`/admin/disputes/${disputeId}/request-information`, {
    method: "POST",
    auth: true,
    body: JSON.stringify({ requestedFrom, message }),
  });
}

export function resolveCanonicalDispute(
  disputeId: string,
  summary: string,
  recommendedActions: string[],
  internalNotes?: string,
) {
  return apiRequest(`/admin/disputes/${disputeId}/resolve-canonical`, {
    method: "POST",
    auth: true,
    body: JSON.stringify({ summary, recommendedActions, internalNotes }),
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

export function closeDispute(disputeId: string, reason: string) {
  return apiRequest(`/admin/disputes/${disputeId}/close`, {
    method: "POST",
    auth: true,
    body: JSON.stringify({ reason }),
  });
}

import type { AgreementsResponse } from "../../legal/types";

export async function getLegalAgreements(): Promise<AgreementsResponse> {
  const documents: AgreementsResponse["documents"] = [];
  let cursor: string | null = null;

  do {
    const query = new URLSearchParams({ pageSize: "50" });
    if (cursor) query.set("cursor", cursor);

    const response = await apiRequest<AgreementsResponse>(
      `/legal/documents?${query.toString()}`,
      { auth: true },
    );
    documents.push(...response.documents);
    cursor = response.pageInfo.hasMore ? response.pageInfo.nextCursor : null;
  } while (cursor);

  return {
    documents,
    pageInfo: { hasMore: false, nextCursor: null },
  };
}

export async function downloadLegalAgreement(
  documentId: string,
  pdfDownloadPath?: string,
): Promise<void> {
  const token = getAdminToken();
  if (!token) {
    throw new Error("You are not signed in.");
  }

  const path =
    pdfDownloadPath ??
    `/api/legal/documents/${encodeURIComponent(documentId)}/download`;
  const apiOrigin = API_BASE_URL.replace(/\/api\/?$/, "");
  const url = path.startsWith("/api")
    ? `${apiOrigin}${path}`
    : `${API_BASE_URL}${path.startsWith("/") ? path : `/${path}`}`;
  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!response.ok) {
    throw new Error("Agreement PDF download failed.");
  }

  const objectUrl = URL.createObjectURL(await response.blob());
  const anchor = document.createElement("a");
  anchor.href = objectUrl;
  anchor.download = `smart-credit-agreement-${documentId}.pdf`;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(objectUrl);
}
