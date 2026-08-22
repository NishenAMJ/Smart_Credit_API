/** @format */
import apiClient from "../axios.config";
import type { DocumentPickerAsset } from "expo-document-picker";

export type DisputeStatus =
  | "open"
  | "under_review"
  | "awaiting_response"
  | "escalated"
  | "resolved"
  | "closed";
export type Dispute = {
  id: string;
  disputeCode: string;
  loanId: string | null;
  subject: string;
  description: string;
  desiredOutcome: string;
  category: string;
  status: DisputeStatus;
  priority: string;
  evidenceDocumentIds: string[];
  resolution: null | {
    summary: string;
    recommendedActions: string[];
    reopenUntil: { _seconds?: number };
  };
  acknowledgements: Record<string, unknown>;
  reopenCount: number;
};
export type DisputeEvent = {
  id: string;
  type: string;
  actorRole: string;
  message: string;
  documentIds: string[];
};
export type EligibleLoan = {
  id: string;
  loanId: string;
  status: string;
  borrowerName?: string;
  lenderName?: string;
};

export const disputesService = {
  async eligibleLoans() {
    return (
      await apiClient.get<{ loans: EligibleLoan[] }>("/disputes/eligible-loans")
    ).data.loans;
  },
  async list() {
    return (
      await apiClient.get<{ disputes: Dispute[] }>("/disputes/mine", {
        params: { limit: 50 },
      })
    ).data.disputes;
  },
  async events(id: string) {
    return (
      await apiClient.get<{ events: DisputeEvent[] }>(`/disputes/${id}/events`)
    ).data.events;
  },
  async create(body: Record<string, unknown>) {
    return (await apiClient.post<{ dispute: Dispute }>("/disputes", body)).data
      .dispute;
  },
  async comment(id: string, message: string, documentIds: string[] = []) {
    await apiClient.post(`/disputes/${id}/comments`, { message, documentIds });
  },
  async acknowledge(id: string) {
    await apiClient.post(`/disputes/${id}/acknowledge`);
  },
  async reopen(id: string, reason: string) {
    await apiClient.post(`/disputes/${id}/reopen`, { reason });
  },
  async evidenceAccess(id: string) {
    return (
      await apiClient.get<{ accessUrl: string }>(`/documents/${id}/access`)
    ).data.accessUrl;
  },
};

export async function uploadDisputeEvidence(
  asset: DocumentPickerAsset,
  loanId?: string | null,
) {
  const mimeType = asset.mimeType ?? "application/octet-stream";
  if ((asset.size ?? 0) > 10 * 1024 * 1024)
    throw new Error(`${asset.name} exceeds 10 MB.`);
  if (
    !["image/jpeg", "image/png", "image/webp", "application/pdf"].includes(
      mimeType,
    )
  )
    throw new Error(`${asset.name} is not supported.`);
  const intent = (
    await apiClient.post<any>("/documents/uploads/init", {
      category: "dispute_evidence",
      documentType: "case_evidence",
      fileName: asset.name,
      contentType: mimeType,
      ...(loanId
        ? { relatedEntityType: "loan", relatedEntityId: loanId }
        : {}),
    })
  ).data;
  const form = new FormData();
  form.append("file", {
    uri: asset.uri,
    name: asset.name,
    type: mimeType,
  } as any);
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
  if (!uploadResponse.ok) throw new Error(`Failed to upload ${asset.name}.`);
  const uploaded = (await uploadResponse.json()) as any;
  return (
    await apiClient.post<{ documentId: string }>(
      "/documents/uploads/complete",
      {
        publicId: uploaded.public_id,
        assetId: uploaded.asset_id,
        resourceType: uploaded.resource_type,
        deliveryType: uploaded.type,
        bytes: uploaded.bytes,
        version: uploaded.version,
        secureUrl: uploaded.secure_url,
        format: uploaded.format,
        fileHash: `mobile-${asset.name}-${asset.size ?? 0}-${Date.now()}`,
        originalFilename: asset.name,
        mimeType,
        category: "dispute_evidence",
        documentType: "case_evidence",
        ...(loanId
          ? { relatedEntityType: "loan", relatedEntityId: loanId }
          : {}),
        displayName: asset.name,
      },
    )
  ).data.documentId;
}
