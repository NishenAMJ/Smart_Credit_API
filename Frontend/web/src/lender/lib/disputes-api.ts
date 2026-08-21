import { io, type Socket } from "socket.io-client";
import { API_BASE_URL, getAuthHeaders } from "./api-config";

export type DisputeStatus =
  | "open"
  | "under_review"
  | "awaiting_response"
  | "escalated"
  | "resolved"
  | "closed";
export type DisputeCategory =
  | "payment"
  | "loan_terms"
  | "fraud"
  | "conduct"
  | "other";
export type TimestampValue = { _seconds?: number };
export type Dispute = {
  id: string;
  disputeCode: string;
  loanId: string;
  transactionId: string | null;
  borrowerName: string;
  lenderName: string;
  complainantId: string;
  respondentId: string;
  category: DisputeCategory;
  subject: string;
  description: string;
  desiredOutcome: string;
  status: DisputeStatus;
  priority: string;
  evidenceDocumentIds: string[];
  resolution: null | {
    summary: string;
    recommendedActions: string[];
    reopenUntil: TimestampValue;
  };
  acknowledgements: Record<string, TimestampValue>;
  reopenCount: number;
  updatedAt: TimestampValue;
};
export type DisputeEvent = {
  id: string;
  type: string;
  actorRole: string;
  message: string;
  documentIds: string[];
  createdAt: TimestampValue;
};
export type EligibleLoan = {
  id: string;
  loanId: string;
  status: string;
  borrowerName?: string;
  lenderName?: string;
};

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    headers: getAuthHeaders({ "Content-Type": "application/json" }),
  });
  if (!response.ok) {
    const body = (await response.json().catch(() => ({}))) as {
      message?: string;
    };
    throw new Error(body.message || "Dispute request failed.");
  }
  return response.json() as Promise<T>;
}

export const disputeApi = {
  loans: () => request<{ loans: EligibleLoan[] }>("/disputes/eligible-loans"),
  list: (status?: DisputeStatus) => {
    const params = new URLSearchParams({ limit: "50" });
    if (status) params.set("status", status);
    return request<{ disputes: Dispute[] }>(
      `/disputes/mine?${params.toString()}`,
    );
  },
  events: (id: string) =>
    request<{ events: DisputeEvent[] }>(`/disputes/${id}/events`),
  create: (body: Record<string, unknown>) =>
    request<{ dispute: Dispute }>("/disputes", {
      method: "POST",
      body: JSON.stringify(body),
    }),
  comment: (id: string, message: string, documentIds: string[] = []) =>
    request(`/disputes/${id}/comments`, {
      method: "POST",
      body: JSON.stringify({ message, documentIds }),
    }),
  acknowledge: (id: string) =>
    request(`/disputes/${id}/acknowledge`, { method: "POST" }),
  reopen: (id: string, reason: string) =>
    request(`/disputes/${id}/reopen`, {
      method: "POST",
      body: JSON.stringify({ reason }),
    }),
  evidenceAccess: (id: string) =>
    request<{ accessUrl: string }>(`/documents/${id}/access`),
};

export async function uploadDisputeEvidence(file: File, loanId: string) {
  if (file.size > 10 * 1024 * 1024)
    throw new Error(`${file.name} exceeds 10 MB.`);
  if (
    !["image/jpeg", "image/png", "image/webp", "application/pdf"].includes(
      file.type,
    )
  )
    throw new Error(`${file.name} is not supported.`);
  const intent = await request<{
    publicId: string;
    uploadUrl: string;
    apiKey: string;
    timestamp: number;
    signature: string;
    folder: string;
    resourceType: string;
    deliveryType: string;
  }>("/documents/uploads/init", {
    method: "POST",
    body: JSON.stringify({
      category: "dispute_evidence",
      documentType: "case_evidence",
      fileName: file.name,
      contentType: file.type,
      relatedEntityType: "loan",
      relatedEntityId: loanId,
    }),
  });
  const form = new FormData();
  form.append("file", file);
  form.append("api_key", intent.apiKey);
  form.append("timestamp", String(intent.timestamp));
  form.append("signature", intent.signature);
  form.append("folder", intent.folder);
  form.append("public_id", intent.publicId);
  form.append("type", intent.deliveryType);
  const uploadResponse = await fetch(intent.uploadUrl, {
    method: "POST",
    body: form,
  });
  if (!uploadResponse.ok) throw new Error(`Failed to upload ${file.name}.`);
  const uploaded = (await uploadResponse.json()) as {
    asset_id: string;
    public_id: string;
    resource_type: string;
    type: string;
    bytes: number;
    version: number;
    secure_url: string;
    format?: string;
  };
  const digest = await crypto.subtle.digest(
    "SHA-256",
    await file.arrayBuffer(),
  );
  const fileHash = [...new Uint8Array(digest)]
    .map((value) => value.toString(16).padStart(2, "0"))
    .join("");
  const completed = await request<{ documentId: string }>(
    "/documents/uploads/complete",
    {
      method: "POST",
      body: JSON.stringify({
        publicId: uploaded.public_id,
        assetId: uploaded.asset_id,
        resourceType: uploaded.resource_type,
        deliveryType: uploaded.type,
        bytes: uploaded.bytes,
        version: uploaded.version,
        secureUrl: uploaded.secure_url,
        format: uploaded.format,
        fileHash,
        originalFilename: file.name,
        mimeType: file.type,
        category: "dispute_evidence",
        documentType: "case_evidence",
        relatedEntityType: "loan",
        relatedEntityId: loanId,
        displayName: file.name,
      }),
    },
  );
  return completed.documentId;
}

export function subscribeToDisputes(token: string, onChange: () => void) {
  const socket: Socket = io(API_BASE_URL.replace(/\/api\/?$/, ""), {
    transports: ["websocket"],
    auth: { token: `Bearer ${token}` },
  });
  socket.on("dispute:changed", onChange);
  socket.io.on("reconnect", onChange);
  return () => {
    socket.disconnect();
  };
}
