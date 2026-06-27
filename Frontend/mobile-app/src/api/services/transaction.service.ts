/** @format */

import apiClient from "../axios.config";
import { ENDPOINTS } from "../endpoints";
import { toIsoDate } from "../normalizers";
import { getUserId } from "../../utils/auth.storage";
import type { BorrowerTransaction } from "../../types/borrower";

type TransactionListResponse = {
  success?: boolean;
  data?: BorrowerTransaction[];
};

function normalizeTransaction(
  transaction: Partial<BorrowerTransaction>,
): BorrowerTransaction {
  return {
    ...transaction,
    transactionId: transaction.transactionId ?? transaction.repaymentId,
    type: transaction.type ?? "repayment",
    timestamp: toIsoDate(transaction.paidAt ?? transaction.createdAt),
    status: transaction.status,
  };
}

export const transactionService = {
  getMyTransactions: async () => {
    const borrowerId = await getUserId();
    if (!borrowerId)
      throw new Error("User session expired. Please log in again.");

    const response = await apiClient.get<TransactionListResponse>(
      ENDPOINTS.transactions.list,
      {
        params: { borrowerId },
      },
    );
    return {
      ...response.data,
      data: Array.isArray(response.data?.data)
        ? response.data.data.map(normalizeTransaction)
        : [],
    };
  },

  getTransactionDetails: async (transactionId: string) => {
    const borrowerId = await getUserId();
    if (!borrowerId)
      throw new Error("User session expired. Please log in again.");

    const response = await apiClient.get<{
      success?: boolean;
      data?: BorrowerTransaction;
    }>(ENDPOINTS.transactions.byId(transactionId), {
      params: { borrowerId },
    });
    return {
      ...response.data,
      data: response.data?.data
        ? normalizeTransaction(response.data.data)
        : null,
    };
  },
};

export async function getTransactions() {
  const response = await transactionService.getMyTransactions();
  return response?.data ?? [];
}

export async function getTransactionById(id: string) {
  const response = await transactionService.getTransactionDetails(id);
  return response?.data ?? null;
}
