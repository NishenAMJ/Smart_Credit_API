import type { UserRole } from '../../auth/auth.types';
import type { LoanAgreementStatus } from '../legal.types';

export class LegalDocumentPartyDto {
  userId!: string;
  fullName!: string;
  email!: string;
  phone!: string;
  role!: 'borrower' | 'lender';
}

export class LegalAgreementTermsDto {
  currency!: 'LKR';
  principalMinor!: number;
  annualInterestRate!: number;
  interestAmountMinor!: number;
  totalRepayableMinor!: number;
  monthlyInstallmentMinor!: number;
  tenureMonths!: number;
  repaymentFrequency!: 'monthly';
  repaymentStartRule!: 'one_month_after_activation';
}

export class LegalAcceptanceSummaryDto {
  accepted!: boolean;
  signedName!: string | null;
  acceptedAt!: string | null;
}

export class LegalDocumentDto {
  id!: string;
  loanId!: string;
  applicationId!: string;
  listingId!: string;
  version!: number;
  title!: string;
  summary!: string;
  documentType!: 'loan_agreement';
  status!: LoanAgreementStatus;
  generatedByUserId!: string;
  generatedByRole!: UserRole | 'system';
  generatedAt!: string;
  updatedAt!: string;
  borrower!: LegalDocumentPartyDto;
  lender!: LegalDocumentPartyDto;
  terms!: LegalAgreementTermsDto;
  htmlContent!: string;
  termsHash!: string;
  consentTextVersion!: 'loan_agreement_consent_v1';
  borrowerAcceptance!: LegalAcceptanceSummaryDto;
  lenderAcceptance!: LegalAcceptanceSummaryDto;
  pdfDownloadPath!: string;
  pdfAvailable!: boolean;
  signedPdfGeneratedAt!: string | null;
  pdfSha256Hash!: string | null;
  legacyReadOnly!: boolean;
}

export class AcceptLegalDocumentDto {
  signedName!: string;
  consentAccepted!: boolean;
  agreementVersion!: number;
  termsHash!: string;
}

export class GenerateLegalDocumentResponseDto {
  message!: string;
  document!: LegalDocumentDto;
}

export class GetLegalDocumentResponseDto {
  document!: LegalDocumentDto | null;
}

export class AcceptLegalDocumentResponseDto {
  message!: string;
  document!: LegalDocumentDto;
}

export class ListLegalDocumentsResponseDto {
  documents!: LegalDocumentDto[];
  pageInfo!: {
    nextCursor: string | null;
    hasMore: boolean;
  };
}
