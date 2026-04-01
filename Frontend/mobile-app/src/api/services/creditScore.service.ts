/** @format */

import apiClient from "../axios.config";
import { ENDPOINTS } from "../endpoints";

export const creditScoreService = {
  getMyCreditScore: async () => {
    const response = await apiClient.get(ENDPOINTS.CREDIT_SCORE);
    return response.data;
  },

  getCreditScoreHistory: async () => {
    const response = await apiClient.get(ENDPOINTS.CREDIT_SCORE_HISTORY);
    return response.data;
  },
};

export async function getCreditScoreSummary() {
  const response = await creditScoreService.getMyCreditScore();
  return response?.data ?? response;
}

export async function getCreditScoreHistory() {
  const response = await creditScoreService.getCreditScoreHistory();
  return response?.data ?? response ?? [];
}
