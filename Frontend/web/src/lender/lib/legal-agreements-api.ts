import type {
  AgreementsResponse,
  SharedLegalDocument,
} from "../../legal/types";
import { API_BASE_URL, getAuthHeaders } from "./api-config";
import { createLenderRealtimeConnection } from "./lender-realtime";
import { apiErrorFromResponse } from "../../lib/validation";

type DocumentResponse = {
  message?: string;
  document: SharedLegalDocument | null;
};

async function readJson<T>(response: Response): Promise<T> {
  const body = (await response.json().catch(() => null)) as {
    message?: string;
  } | null;
  if (!response.ok) {
    throw apiErrorFromResponse(
      response.status,
      body,
      "Agreement request failed.",
    );
  }
  return body as T;
}

export async function fetchLenderAgreements(
  cursor?: string | null,
): Promise<AgreementsResponse> {
  const params = new URLSearchParams({ pageSize: "50" });
  if (cursor) params.set("cursor", cursor);
  const response = await fetch(`${API_BASE_URL}/legal/documents?${params}`, {
    headers: getAuthHeaders(),
  });
  return readJson<AgreementsResponse>(response);
}

export async function fetchLatestLenderAgreement(
  loanId: string,
): Promise<SharedLegalDocument | null> {
  const response = await fetch(
    `${API_BASE_URL}/legal/documents/loan/${encodeURIComponent(loanId)}/latest`,
    { headers: getAuthHeaders() },
  );
  return (await readJson<DocumentResponse>(response)).document;
}

export async function acceptLenderAgreement(
  agreement: SharedLegalDocument,
  signedName: string,
): Promise<DocumentResponse> {
  const response = await fetch(
    `${API_BASE_URL}/legal/documents/${encodeURIComponent(agreement.id)}/accept`,
    {
      method: "POST",
      headers: getAuthHeaders({ "Content-Type": "application/json" }),
      body: JSON.stringify({
        signedName,
        consentAccepted: true,
        agreementVersion: agreement.version,
        termsHash: agreement.termsHash,
      }),
    },
  );
  return readJson<DocumentResponse>(response);
}

export async function retryLenderAgreementFinalization(
  agreementId: string,
): Promise<DocumentResponse> {
  const response = await fetch(
    `${API_BASE_URL}/legal/documents/${encodeURIComponent(agreementId)}/finalize`,
    { method: "POST", headers: getAuthHeaders() },
  );
  return readJson<DocumentResponse>(response);
}

export async function confirmLenderDisbursement(
  agreementId: string,
  externalReference?: string,
): Promise<DocumentResponse> {
  const response = await fetch(
    `${API_BASE_URL}/legal/documents/${encodeURIComponent(agreementId)}/disbursement-confirmation`,
    {
      method: "POST",
      headers: getAuthHeaders({ "Content-Type": "application/json" }),
      body: JSON.stringify({
        confirmationAccepted: true,
        externalReference: externalReference?.trim() || undefined,
      }),
    },
  );
  return readJson<DocumentResponse>(response);
}

export async function downloadLenderAgreement(
  agreement: SharedLegalDocument,
): Promise<void> {
  const apiOrigin = API_BASE_URL.replace(/\/api\/?$/, "");
  const path = agreement.pdfDownloadPath;
  const url = path.startsWith("/api")
    ? `${apiOrigin}${path}`
    : `${API_BASE_URL}${path.startsWith("/") ? path : `/${path}`}`;
  const response = await fetch(url, { headers: getAuthHeaders() });
  if (!response.ok) {
    throw new Error("Agreement PDF download failed.");
  }

  const objectUrl = URL.createObjectURL(await response.blob());
  const anchor = document.createElement("a");
  anchor.href = objectUrl;
  anchor.download = `smart-credit-agreement-${agreement.loanId}-v${agreement.version}.pdf`;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(objectUrl), 0);
}

export function subscribeToAgreementChanges(
  token: string,
  onChange: () => void,
) {
  const connection = createLenderRealtimeConnection(token);
  const { socket } = connection;
  socket.on("agreement:changed", onChange);
  socket.io.on("reconnect", onChange);
  return connection.disconnect;
}
