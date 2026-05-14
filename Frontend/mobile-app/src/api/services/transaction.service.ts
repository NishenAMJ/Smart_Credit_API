/** @format */

import apiClient from "../axios.config";
import { ENDPOINTS } from "../endpoints";

export const transactionService = {
  getMyTransactions: async () => {
    const response = await apiClient.get(ENDPOINTS.MY_TRANSACTIONS);
    return response.data;
  },

  getTransactionDetails: async (transactionId: string) => {
    const response = await apiClient.get(
      ENDPOINTS.TRANSACTION_DETAILS(transactionId),
    );
    return response.data;
  },
};

export async function getTransactions() {
  const response = await transactionService.getMyTransactions();
  return response?.data ?? response ?? [];
}

export async function getTransactionById(id: string) {
  const response = await transactionService.getTransactionDetails(id);
  return response?.data ?? response;
}
