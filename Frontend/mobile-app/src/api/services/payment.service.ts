/** @format */

import apiClient from "../axios.config";
import { ENDPOINTS } from "../endpoints";
import { toIsoDate } from "../normalizers";
import { getUserId } from "../../utils/auth.storage";
import type { BorrowerRepayment } from "../../types/borrower";
import type { ImagePickerAsset } from "expo-image-picker";

export interface MakeRepaymentPayload {
  loanId: string;
  amount: number;
  paymentMethod: "bank_transfer" | "qr_payment" | "card";
  transactionReference?: string;
  paymentProofUrl?: string;
  receiptDocumentId?: string;
}

export interface InitiatePayHerePayload {
  loanId: string;
  amount: number;
}

export interface PayHereCheckoutSession {
  orderId: string;
  paymentPageUrl: string;
  checkoutUrl: string;
}

type RepaymentListResponse = {
  success?: boolean;
  data?: BorrowerRepayment[];
};

function normalizeRepayment(
  repayment: Partial<BorrowerRepayment>,
): BorrowerRepayment {
  const rawStatus = String(repayment.status ?? "").toLowerCase();

  return {
    ...repayment,
    paymentId: repayment.paymentId ?? repayment.repaymentId,
    dueDate: toIsoDate(repayment.dueDate),
    paidAt: toIsoDate(repayment.paidAt),
    status:
      rawStatus === "completed"
        ? "PAID"
        : rawStatus === "pending"
          ? "PENDING"
          : rawStatus.toUpperCase(),
  };
}

export const paymentService = {
  uploadPaymentReceipt: async (
    asset: ImagePickerAsset,
    loanId: string,
  ): Promise<string> => {
    const fileName = asset.fileName || `payment-receipt-${Date.now()}.jpg`;
    const mimeType = asset.mimeType || "image/jpeg";
    const intent = (
      await apiClient.post<any>("/documents/uploads/init", {
        category: "payment_receipt",
        documentType: "bank_transfer_receipt",
        fileName,
        contentType: mimeType,
        relatedEntityType: "loan",
        relatedEntityId: loanId,
      })
    ).data;
    const form = new FormData();
    form.append("file", {
      uri: asset.uri,
      name: fileName,
      type: mimeType,
    } as any);
    form.append("api_key", intent.apiKey);
    form.append("timestamp", String(intent.timestamp));
    form.append("signature", intent.signature);
    form.append("folder", intent.folder);
    form.append("public_id", intent.publicId);
    form.append("type", intent.deliveryType);
    const uploadedResponse = await fetch(intent.uploadUrl, {
      method: "POST",
      body: form,
    });
    if (!uploadedResponse.ok) {
      throw new Error("The receipt could not be uploaded.");
    }
    const uploaded = (await uploadedResponse.json()) as any;
    const completed = await apiClient.post<{ documentId: string }>(
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
        fileHash: `receipt-${loanId}-${asset.fileSize ?? 0}-${Date.now()}`,
        originalFilename: fileName,
        mimeType,
        category: "payment_receipt",
        documentType: "bank_transfer_receipt",
        relatedEntityType: "loan",
        relatedEntityId: loanId,
        displayName: "Bank transfer receipt",
      },
    );
    return completed.data.documentId;
  },

  makeRepayment: async (data: MakeRepaymentPayload) => {
    const borrowerId = await getUserId();
    if (!borrowerId)
      throw new Error("User session expired. Please log in again.");

    const response = await apiClient.post<{
      success?: boolean;
      data?: BorrowerRepayment;
    }>(
      ENDPOINTS.repayments.make,
      { ...data, borrowerId },
      { params: { borrowerId } },
    );
    return {
      ...response.data,
      data: normalizeRepayment(response.data?.data ?? {}),
    };
  },

  initiatePayHerePayment: async (data: InitiatePayHerePayload) => {
    const borrowerId = await getUserId();
    if (!borrowerId)
      throw new Error("User session expired. Please log in again.");

    const response = await apiClient.post<{
      success?: boolean;
      data?: PayHereCheckoutSession;
    }>(
      ENDPOINTS.repayments.initiatePayHere,
      { ...data, borrowerId },
      { params: { borrowerId } },
    );

    if (!response.data?.data?.paymentPageUrl) {
      throw new Error("PayHere checkout could not be started.");
    }

    return response.data.data;
  },

  generateQr: async (loanId: string) => {
    const borrowerId = await getUserId();
    if (!borrowerId)
      throw new Error("User session expired. Please log in again.");

    const response = await apiClient.post<{
      success?: boolean;
      data?: {
        token: string;
        expiresAt: number;
        borrowerId: string;
        loanId: string;
        amount: number;
      };
    }>(
      ENDPOINTS.repayments.generateQr,
      { loanId, borrowerId },
      { params: { borrowerId } },
    );
    return response.data?.data;
  },

  getRepaymentHistory: async () => {
    const borrowerId = await getUserId();
    if (!borrowerId)
      throw new Error("User session expired. Please log in again.");

    const response = await apiClient.get<RepaymentListResponse>(
      ENDPOINTS.repayments.list,
      {
        params: { borrowerId },
      },
    );
    return {
      ...response.data,
      data: Array.isArray(response.data?.data)
        ? response.data.data.map(normalizeRepayment)
        : [],
    };
  },
};
export async function getPayments() {
  const response = await paymentService.getRepaymentHistory();
  return response?.data ?? [];
}
