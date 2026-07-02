import type { Timestamp } from 'firebase-admin/firestore';

import type { UserRole } from '../auth/auth.types';
import type {
  LegalDocumentStatus,
  LoanAgreementDocumentType,
} from './dto/legal-document.dto';

export interface LegalDocumentParty {
  userId: string;
  fullName: string;
  email: string;
  phone: string;
  role: 'borrower' | 'lender';
}

export interface LegalPartySignatureAudit {
  signedName?: string;
  ipAddress?: string;
  userAgent?: string;
}

export interface LegalLoanSnapshot {
  loanId: string;
  amount: number;
  interestRate: number;
  durationMonths: number;
  repaymentSchedule: string;
  status: string;
  nextDueDate?: Timestamp;
}

export interface LegalDocument {
  id: string;
  loanId: string;
  title: string;
  summary: string;
  documentType: LoanAgreementDocumentType;
  status: LegalDocumentStatus;
  generatedByUserId: string;
  generatedByRole: UserRole;
  generatedAt: Timestamp;
  updatedAt: Timestamp;
  borrower: LegalDocumentParty;
  lender: LegalDocumentParty;
  loanSnapshot: LegalLoanSnapshot;
  htmlContent: string;
  borrowerAccepted: boolean;
  lenderAccepted: boolean;
  borrowerAcceptedAt?: Timestamp;
  lenderAcceptedAt?: Timestamp;
  borrowerSignatureAudit?: LegalPartySignatureAudit;
  lenderSignatureAudit?: LegalPartySignatureAudit;
  pdfDownloadPath?: string;
  signedPdfStoragePath?: string;  // legacy – Firebase Storage path (kept for backward compat)
  signedPdfDocumentId?: string;  // preferred – Firestore ID of the documents record for the Cloudinary PDF
  signedPdfGeneratedAt?: Timestamp;
  pdfSha256Hash?: string;
}
