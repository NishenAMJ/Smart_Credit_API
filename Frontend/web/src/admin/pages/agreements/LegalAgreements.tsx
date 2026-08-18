import { useCallback } from "react";
import { downloadLegalAgreement, getLegalAgreements } from "../../lib/api";
import AgreementsPage from "../../../legal/AgreementsPage";
import type { AgreementsResponse } from "../../../legal/types";

export default function LegalAgreements() {
  const fetcher = useCallback(async (): Promise<AgreementsResponse> => {
    return getLegalAgreements();
  }, []);

  const handleDownload = (documentId: string, pdfDownloadPath?: string) => {
    void downloadLegalAgreement(documentId, pdfDownloadPath);
  };

  return (
    <AgreementsPage
      role="admin"
      fetcher={fetcher}
      onDownload={handleDownload}
      title="Loan Agreements"
      subtitle="Read-only view of versioned borrower and lender loan contracts."
    />
  );
}
