import type { UserRole } from '../../auth/auth.types';

export type LegalDocumentStatus =
  | 'generated'
  | 'partially_accepted'
  | 'fully_accepted';

export type LoanAgreementDocumentType = 'loan_agreement';

export class LegalDocumentPartyDto {
  userId!: string;
  fullName!: string;
  email!: string;
  phone!: string;
  role!: 'borrower' | 'lender';
}

export class LegalPartySignatureAuditDto {
  signedName?: string;
  ipAddress?: string;
  userAgent?: string;
}

export class LegalLoanSnapshotDto {
  loanId!: string;
  amount!: number;
  interestRate!: number;
  durationMonths!: number;
  repaymentSchedule!: string;
  status!: string;
  nextDueDate?: string;
}

export class LegalDocumentDto {
  id!: string;
  loanId!: string;
  title!: string;
  summary!: string;
  documentType!: LoanAgreementDocumentType;
  status!: LegalDocumentStatus;
  generatedByUserId!: string;
  generatedByRole!: UserRole;
  generatedAt!: string;
  updatedAt!: string;
  borrower!: LegalDocumentPartyDto;
  lender!: LegalDocumentPartyDto;
  loanSnapshot!: LegalLoanSnapshotDto;
  htmlContent!: string;
  borrowerAccepted!: boolean;
  lenderAccepted!: boolean;
  borrowerAcceptedAt?: string;
  lenderAcceptedAt?: string;
  borrowerSignatureAudit?: LegalPartySignatureAuditDto;
  lenderSignatureAudit?: LegalPartySignatureAuditDto;
  pdfDownloadPath?: string;
  signedPdfStoragePath?: string;
  signedPdfDocumentId?: string;
  /** Short-lived signed Cloudinary URL – only present when the caller requests it via the access endpoint. */
  signedPdfAccessUrl?: string;
  signedPdfGeneratedAt?: string;
  pdfSha256Hash?: string;
}

export class AcceptLegalDocumentDto {
  signedName!: string;
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
}
