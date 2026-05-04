import { useCallback } from "react";
import { getLegalAgreements, getApiBaseUrl } from "../../lib/api";
import { getAdminToken } from "../../lib/auth";
import AgreementsPage from "../../../legal/AgreementsPage";
import type { AgreementsResponse } from "../../../legal/types";

export default function LegalAgreements() {
  const fetcher = useCallback(async (): Promise<AgreementsResponse> => {
    return getLegalAgreements();
  }, []);

  const handleDownload = (documentId: string, pdfDownloadPath?: string) => {
    const token = getAdminToken();
    if (!token) return;

    const path =
      pdfDownloadPath ?? `/api/legal/documents/${documentId}/download`;
    const url = `${getApiBaseUrl().replace("/api", "")}${path}?token=${encodeURIComponent(token)}`;

    window.open(url, "_blank");
  };

  return (
    <AgreementsPage
      role="admin"
      fetcher={fetcher}
      onDownload={handleDownload}
      title="Platform Agreements"
      subtitle="Comprehensive view of all legal documents generated across Smart Credit+."
    />
  );
}
