/** @format */

import apiClient from "../axios.config";
import { ENDPOINTS } from "../endpoints";

export const loanService = {
  searchLoans: async (keyword: string) => {
    const response = await apiClient.get(ENDPOINTS.SEARCH_LOANS, {
      params: { keyword },
    });
    return response.data;
  },

  getFeaturedLoans: async () => {
    const response = await apiClient.get(ENDPOINTS.FEATURED_LOANS);
    return response.data;
  },

  getLoanDetails: async (loanId: string) => {
    const response = await apiClient.get(ENDPOINTS.LOAN_DETAILS(loanId));
    return response.data;
  },

  filterLoans: async (filters: Record<string, unknown>) => {
    const response = await apiClient.post(ENDPOINTS.FILTER_LOANS, filters);
    return response.data;
  },
};

export async function getFeaturedLoans() {
  const response = await loanService.getFeaturedLoans();
  return response?.data ?? response ?? [];
}

export async function searchLoans(keyword: string) {
  const response = await loanService.searchLoans(keyword);
  return response?.data ?? response ?? [];
}
