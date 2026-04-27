/** @format */

import apiClient from "../axios.config";
import { ENDPOINTS } from "../endpoints";
import { getUserId } from "../../utils/auth.storage";
import type { CreditScoreSummary } from "../../types/borrower";

type CreditHistoryPoint = {
  month: string;
  score: number;
  note?: string;
};

export const creditScoreService = {
  getMyCreditScore: async (): Promise<{
    data: CreditScoreSummary & {
      creditScore: number;
      creditRating: string;
    };
  }> => {
    const borrowerId = await getUserId();
    if (!borrowerId)
      throw new Error("User session expired. Please log in again.");

    const response = await apiClient.get(ENDPOINTS.creditScore.get, {
      params: { borrowerId },
    });
    const payload = response.data?.data ?? {};
    const creditScore = payload.score ?? 0;
    const creditRating =
      creditScore >= 750
        ? "Excellent"
        : creditScore >= 700
          ? "Good"
          : creditScore >= 650
            ? "Fair"
            : creditScore >= 600
              ? "Poor"
              : "Very Poor";

    return {
      data: {
        smartScore: creditScore,
        creditScore,
        creditRating,
        creditLimit: payload.creditLimit,
      },
    };
  },

  getCreditHistory: async () => {
    const borrowerId = await getUserId();
    if (!borrowerId)
      throw new Error("User session expired. Please log in again.");

    const response = await apiClient.get<{ data?: CreditHistoryPoint[] }>(
      ENDPOINTS.creditScore.history,
      {
        params: { borrowerId },
      },
    );
    return {
      ...response.data,
      data: Array.isArray(response.data?.data)
        ? response.data.data.map((item) => ({
            month: String(item.month ?? ""),
            score: Number(item.score ?? 0),
            note: item.note ?? `Credit score recorded at ${item.score ?? 0}`,
          }))
        : [],
    };
  },
};
