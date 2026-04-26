/** @format */

import apiClient from "../axios.config";

export interface SupportStatus {
  id: string;
  title: string;
  value: string;
  subtitle: string;
  color: string;
}

export const supportService = {
  getSupportStatus: async (borrowerId: string): Promise<SupportStatus[]> => {
    try {
      const response = await apiClient.get<{
        success: boolean;
        data: SupportStatus[];
      }>("/borrower/support/status", {
        params: { borrowerId },
      });
      return response.data?.data ?? [];
    } catch (error) {
      console.error("Error fetching support status:", error);
      return [];
    }
  },
};
