import { fetchLenderApi, parseApiError } from "./api-client";

export interface LenderLegalDocumentParty {
  userId: string;
  fullName: string;
  email: string;
  phone: string;
  role: "borrower" | "lender";
}

export interface LenderLegalDocument {
  id: string;
  loanId: string;
  title: string;
  summary: string;
  documentType: string;
  status: string;
  borrower: LenderLegalDocumentParty;
  lender: LenderLegalDocumentParty;
  updatedAt: string;
  pdfDownloadPath?: string;
}

export interface LenderLegalDocumentsResponse {
  documents: LenderLegalDocument[];
}

export const LenderAgreementsApi = {
  getLegalAgreements: async (): Promise<LenderLegalDocumentsResponse> => {
    const response = await fetchLenderApi("/legal/documents", {
      method: "GET",
    });

    if (!response.ok) {
      return parseApiError(response, "Failed to load legal agreements");
    }

    return response.json() as Promise<LenderLegalDocumentsResponse>;
  },
};
