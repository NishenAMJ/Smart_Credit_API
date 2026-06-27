/** @format */

export type MobileRole = "borrower" | "lender";
export type UserRole = MobileRole | "admin";
export type AuthMode = "login" | "register";

export type AuthUser = {
  uid: string;
  fullName: string;
  email: string;
  phone: string;
  role: UserRole;
  kycStatus: string;
};

export type LoginPayload = {
  identifier: string;
  password: string;
  role?: MobileRole;
};

export type RegisterPayload = {
  fullName: string;
  email: string;
  phone: string;
  password: string;
  role: MobileRole;
};

export type SubmitKycPayload = {
  documentType: string;
  documentNumber: string;
  fullName: string;
  issuingCountry?: string;
  expiryDate?: string;
  documentFrontUrl?: string;
  documentBackUrl?: string;
  selfieUrl?: string;
  profilePictureUrl?: string;
};

export type RegisterResponse = {
  message: string;
  user: AuthUser;
};

export type AuthResponse = {
  accessToken: string;
  user: AuthUser;
};

export type SessionResponse = {
  message: string;
  activeRole: UserRole;
  availableRoles: UserRole[];
  accountStatus: string;
  kycStatus: string;
  user: AuthUser;
};

export type DashboardMetric = {
  label: string;
  value: string;
  helper: string;
};

export type DashboardListItem = {
  id: string;
  title: string;
  subtitle: string;
  meta: string;
  status: string;
};

export type DashboardResponse = {
  user: AuthUser;
  role: UserRole;
  headline: string;
  summary: string;
  metrics: DashboardMetric[];
  primaryListTitle: string;
  primaryList: DashboardListItem[];
  secondaryListTitle: string;
  secondaryList: DashboardListItem[];
};

export type KycSubmission = {
  id: string;
  userId: string;
  status:
    | "not_submitted"
    | "pending"
    | "under_review"
    | "approved"
    | "rejected";
  documentType: string;
  documentNumber: string;
  fullName: string;
  issuingCountry?: string;
  expiryDate?: string;
  documentFrontUrl?: string;
  documentBackUrl?: string;
  selfieUrl?: string;
  profilePictureUrl?: string;
  reviewNotes?: string;
  submittedAt: string;
  reviewedAt?: string;
  reviewedBy?: string;
};

export type KycSubmissionResponse = {
  message: string;
  submission: KycSubmission;
};

export type MyKycSubmissionResponse = {
  submission: KycSubmission | null;
};

export type LegalDocumentStatus =
  | "generated"
  | "partially_accepted"
  | "fully_accepted";

export type LegalDocumentParty = {
  userId: string;
  fullName: string;
  email: string;
  phone: string;
  role: "borrower" | "lender";
};

export type LegalLoanSnapshot = {
  loanId: string;
  amount: number;
  interestRate: number;
  durationMonths: number;
  repaymentSchedule: string;
  status: string;
  nextDueDate?: string;
};

export type LegalDocument = {
  id: string;
  loanId: string;
  title: string;
  summary: string;
  documentType: "loan_agreement";
  status: LegalDocumentStatus;
  generatedByUserId: string;
  generatedByRole: UserRole;
  generatedAt: string;
  updatedAt: string;
  borrower: LegalDocumentParty;
  lender: LegalDocumentParty;
  loanSnapshot: LegalLoanSnapshot;
  htmlContent: string;
  borrowerAccepted: boolean;
  lenderAccepted: boolean;
  borrowerAcceptedAt?: string;
  lenderAcceptedAt?: string;
  borrowerSignatureAudit?: {
    signedName?: string;
    ipAddress?: string;
    userAgent?: string;
  };
  lenderSignatureAudit?: {
    signedName?: string;
    ipAddress?: string;
    userAgent?: string;
  };
  pdfDownloadPath?: string;
};

export type LegalDocumentResponse = {
  message?: string;
  document: LegalDocument | null;
};
