export type AgreementStatus =
  | "awaiting_signatures"
  | "partially_accepted"
  | "finalizing"
  | "finalization_failed"
  | "fully_accepted"
  | "superseded"
  | "cancelled";

export interface AgreementParty {
  userId: string;
  fullName: string;
  email: string;
  phone: string;
  role: "borrower" | "lender";
}

export interface AgreementAcceptanceSummary {
  accepted: boolean;
  signedName: string | null;
  acceptedAt: string | null;
}

export interface AgreementTerms {
  currency: "LKR";
  principalMinor: number;
  annualInterestRate: number;
  interestAmountMinor: number;
  totalRepayableMinor: number;
  monthlyInstallmentMinor: number;
  tenureMonths: number;
  repaymentFrequency: "monthly";
  repaymentStartRule: "one_month_after_activation";
}

export interface SharedLegalDocument {
  id: string;
  loanId: string;
  applicationId: string;
  listingId: string;
  version: number;
  title: string;
  summary: string;
  documentType: "loan_agreement";
  status: AgreementStatus;
  borrower: AgreementParty;
  lender: AgreementParty;
  terms: AgreementTerms;
  htmlContent: string;
  termsHash: string;
  consentTextVersion: "loan_agreement_consent_v1";
  borrowerAcceptance: AgreementAcceptanceSummary;
  lenderAcceptance: AgreementAcceptanceSummary;
  pdfDownloadPath: string;
  pdfAvailable: boolean;
  signedPdfGeneratedAt: string | null;
  pdfSha256Hash: string | null;
  legacyReadOnly: boolean;
  generatedAt: string;
  updatedAt: string;
}

export interface AgreementsResponse {
  documents: SharedLegalDocument[];
  pageInfo: {
    nextCursor: string | null;
    hasMore: boolean;
  };
}

export interface AgreementsPageProps {
  role: "admin" | "lender";
  fetcher: () => Promise<AgreementsResponse>;
  onDownload: (documentId: string, pdfDownloadPath?: string) => void;
  title?: string;
  subtitle?: string;
}
