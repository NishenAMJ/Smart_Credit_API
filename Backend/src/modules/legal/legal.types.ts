import type { Timestamp } from 'firebase-admin/firestore';

import type { UserRole } from '../auth/auth.types';

export type LoanAgreementStatus =
  | 'awaiting_signatures'
  | 'awaiting_disbursement'
  | 'awaiting_borrower_signature'
  | 'partially_accepted'
  | 'finalizing'
  | 'finalization_failed'
  | 'fully_accepted'
  | 'superseded'
  | 'cancelled';

export interface LoanAgreementParty {
  userId: string;
  fullName: string;
  email: string;
  phone: string;
  role: 'borrower' | 'lender';
}

export interface LoanAgreementTerms {
  currency: 'LKR';
  principalMinor: number;
  annualInterestRate: number;
  interestAmountMinor: number;
  totalRepayableMinor: number;
  monthlyInstallmentMinor: number;
  tenureMonths: number;
  repaymentFrequency: 'monthly';
  repaymentStartRule: 'one_month_after_activation';
}

export interface LoanAgreementAcceptanceSummary {
  accepted: boolean;
  signedName: string | null;
  acceptedAt: Timestamp | null;
}

export interface LoanAgreementDisbursementConfirmation {
  confirmed: boolean;
  confirmedByLenderId: string | null;
  confirmedAt: Timestamp | null;
  principalMinor: number | null;
  externalReference: string | null;
  ipAddressHash: string | null;
  userAgent: string | null;
}

export interface LoanAgreementDocument {
  agreementId: string;
  loanId: string;
  applicationId: string;
  listingId: string;
  version: number;
  status: LoanAgreementStatus;
  title: string;
  summary: string;
  borrowerId: string;
  lenderId: string;
  borrower: LoanAgreementParty;
  lender: LoanAgreementParty;
  terms: LoanAgreementTerms;
  bodyHtml: string;
  termsHash: string;
  consentTextVersion: 'loan_agreement_consent_v1';
  borrowerAcceptance: LoanAgreementAcceptanceSummary;
  lenderAcceptance: LoanAgreementAcceptanceSummary;
  disbursementConfirmation: LoanAgreementDisbursementConfirmation;
  generatedByUserId: string;
  generatedByRole: UserRole | 'system';
  generatedAt: Timestamp;
  updatedAt: Timestamp;
  finalizedAt: Timestamp | null;
  finalizationStartedAt: Timestamp | null;
  finalizationError: string | null;
  signedPdfDocumentId: string | null;
  signedPdfGeneratedAt: Timestamp | null;
  pdfSha256Hash: string | null;
  migratedFromLegalDocumentId?: string | null;
  legacyReadOnly?: boolean;
}

export interface LoanAgreementAcceptanceDocument {
  acceptanceId: string;
  agreementId: string;
  loanId: string;
  userId: string;
  role: 'borrower' | 'lender';
  agreementVersion: number;
  termsHash: string;
  signedName: string;
  consentAccepted: true;
  consentTextVersion: 'loan_agreement_consent_v1';
  ipAddressHash: string | null;
  userAgent: string | null;
  acceptedAt: Timestamp;
  fundsReceivedConfirmed: boolean;
}

export interface AcceptLoanAgreementInput {
  signedName: string;
  consentAccepted: boolean;
  agreementVersion: number;
  termsHash: string;
  ipAddress?: string;
  userAgent?: string;
  fundsReceivedConfirmed?: boolean;
}

export interface ConfirmAgreementDisbursementInput {
  confirmationAccepted: boolean;
  externalReference?: string;
  ipAddress?: string;
  userAgent?: string;
}
