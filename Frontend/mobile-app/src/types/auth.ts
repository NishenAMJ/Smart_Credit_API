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
  | "awaiting_signatures"
  | "awaiting_disbursement"
  | "awaiting_borrower_signature"
  | "partially_accepted"
  | "finalizing"
  | "finalization_failed"
  | "fully_accepted"
  | "superseded"
  | "cancelled";

export type LegalDocumentParty = {
  userId: string;
  fullName: string;
  email: string;
  phone: string;
  role: "borrower" | "lender";
};

export type LegalAgreementTerms = {
  currency: "LKR";
  principalMinor: number;
  annualInterestRate: number;
  interestAmountMinor: number;
  totalRepayableMinor: number;
  monthlyInstallmentMinor: number;
  tenureMonths: number;
  repaymentFrequency: "monthly";
  repaymentStartRule: "one_month_after_activation";
};

export type LegalAcceptanceSummary = {
  accepted: boolean;
  signedName: string | null;
  acceptedAt: string | null;
};

export type LegalDisbursementConfirmation = {
  confirmed: boolean;
  confirmedByLenderId: string | null;
  confirmedAt: string | null;
  principalMinor: number | null;
  externalReference: string | null;
};

export type LegalDocument = {
  id: string;
  loanId: string;
  applicationId: string;
  listingId: string;
  version: number;
  title: string;
  summary: string;
  documentType: "loan_agreement";
  status: LegalDocumentStatus;
  generatedByUserId: string;
  generatedByRole: UserRole | "system";
  generatedAt: string;
  updatedAt: string;
  borrower: LegalDocumentParty;
  lender: LegalDocumentParty;
  terms: LegalAgreementTerms;
  htmlContent: string;
  termsHash: string;
  consentTextVersion: "loan_agreement_consent_v1";
  borrowerAcceptance: LegalAcceptanceSummary;
  lenderAcceptance: LegalAcceptanceSummary;
  disbursementConfirmation: LegalDisbursementConfirmation;
  pdfDownloadPath: string;
  pdfAvailable: boolean;
  signedPdfGeneratedAt: string | null;
  pdfSha256Hash: string | null;
  legacyReadOnly: boolean;
};

export type LegalDocumentsResponse = {
  documents: LegalDocument[];
  pageInfo: { nextCursor: string | null; hasMore: boolean };
};

export type LegalDocumentResponse = {
  message?: string;
  document: LegalDocument | null;
};
