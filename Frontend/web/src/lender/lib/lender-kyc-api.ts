import { API_BASE_URL, getAuthHeaders } from "./api-config";

export type LenderKycSubmission = {
  id: string;
  userId: string;
  status: string;
  documentType: string;
  documentNumber: string;
  fullName: string;
  reviewNotes: string;
  submittedAt: string | null;
  reviewedAt?: string | null;
};

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    headers: getAuthHeaders({ "Content-Type": "application/json" }),
  });

  if (!response.ok) {
    const body = (await response.json().catch(() => ({}))) as {
      message?: string | string[];
    };
    const message = Array.isArray(body.message)
      ? body.message.join(", ")
      : body.message;
    throw new Error(message || "KYC request failed.");
  }

  return response.json() as Promise<T>;
}

export async function fetchMyKycSubmission() {
  return request<{ submission: LenderKycSubmission | null }>(
    "/kyc/my-submission",
  );
}

export async function resubmitLenderKyc(payload: {
  documentFrontUrl: string;
  documentBackUrl: string;
  selfieUrl?: string;
}) {
  return request<{
    success: boolean;
    kycStatus: "pending";
    documentIds: string[];
    message: string;
  }>("/kyc/resubmit", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}
