export type AgreementStatus =
  | "generated"
  | "partially_accepted"
  | "fully_accepted";

export interface PartySignatureAudit {
  userId: string;
  fullName: string;
  email: string;
  signedAt: string;
  ipAddress: string;
  userAgent: string;
  signedName: string;
}

export interface SharedLegalDocument {
  id: string;
  loanId: string;
  status: AgreementStatus;
  borrower: {
    userId: string;
    fullName: string;
    email: string;
  };
  lender: {
    userId: string;
    fullName: string;
    email: string;
  };
  borrowerSignatureAudit?: PartySignatureAudit;
  lenderSignatureAudit?: PartySignatureAudit;
  pdfDownloadPath?: string;
  pdfSha256Hash?: string;
  createdAt: string;
  updatedAt: string;
}

export interface AgreementsResponse {
  success: boolean;
  documents: SharedLegalDocument[];
  count: number;
}

export interface AgreementsPageProps {
  role: "admin" | "lender";
  fetcher: () => Promise<AgreementsResponse>;
  onDownload: (documentId: string, pdfDownloadPath?: string) => void;
  title?: string;
  subtitle?: string;
}
