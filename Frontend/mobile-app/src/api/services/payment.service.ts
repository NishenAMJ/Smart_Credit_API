/** @format */

import apiClient from "../axios.config";
import { ENDPOINTS } from "../endpoints";
import { toIsoDate } from "../normalizers";
import { getUserId } from "../../utils/auth.storage";
import type { BorrowerRepayment } from "../../types/borrower";

export interface MakeRepaymentPayload {
  loanId: string;
  amount: number;
  paymentMethod: "bank_transfer" | "qr_payment" | "card";
  transactionReference?: string;
  paymentProofUrl?: string;
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
  uploadPaymentReceipt: async (imageUri: string): Promise<string> => {
    // Simulate a network delay for uploading
    await new Promise((resolve) => setTimeout(resolve, 1500));
    // Mock the uploaded URL
    return `https://mock-storage.com/receipts/${Date.now()}.jpg`;
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
