import { useCallback } from "react";
import type { LenderSession } from "../lib/lender-session";
import { LenderAgreementsApi } from "../lib/lender-agreements-api";
import AgreementsPage from "../../legal/AgreementsPage";
import type { AgreementsResponse } from "../../legal/types";

type AgreementsPageProps = {
  session: LenderSession;
};

export default function LenderAgreements({ session }: AgreementsPageProps) {
  const fetcher = useCallback(async (): Promise<AgreementsResponse> => {
    const response = await LenderAgreementsApi.getLegalAgreements();
    return {
      success: true,
      documents: response.documents as any[],
      count: response.documents?.length || 0,
    };
  }, []);

  const handleDownload = (documentId: string, pdfDownloadPath?: string) => {
    const token = session.accessToken;
    if (!token) return;

    const API_BASE_URL =
      (import.meta.env.VITE_API_BASE_URL as string | undefined)?.replace(
        /\/$/,
        "",
      ) ?? "/api";
    const path = pdfDownloadPath ?? `/legal/documents/${documentId}/download`;
    const fullUrl = `${API_BASE_URL}${path}?token=${encodeURIComponent(token)}`;

    window.open(fullUrl, "_blank");
  };

  return (
    <AgreementsPage
      role="lender"
      fetcher={fetcher}
      onDownload={handleDownload}
      title="Agreements"
      subtitle="View and download your agreements."
    />
  );
}
