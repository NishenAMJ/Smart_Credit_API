/** @format */

import apiClient from "../axios.config";
import { ENDPOINTS } from "../endpoints";

export const paymentService = {
  getMyPayments: async () => {
    const response = await apiClient.get(ENDPOINTS.MY_PAYMENTS);
    return response.data;
  },

  createPayment: async (data: Record<string, unknown>) => {
    const response = await apiClient.post(ENDPOINTS.CREATE_PAYMENT, data);
    return response.data;
  },

  generateQR: async (loanId: string) => {
    const response = await apiClient.post(ENDPOINTS.GENERATE_QR, { loanId });
    return response.data;
  },

  uploadReceipt: async (data: Record<string, unknown>) => {
    const response = await apiClient.post(ENDPOINTS.UPLOAD_RECEIPT, data);
    return response.data;
  },
};

export async function getPayments() {
  const response = await paymentService.getMyPayments();
  return response?.data ?? response ?? [];
}
