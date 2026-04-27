/** @format */

import apiClient from "../axios.config";
import { ENDPOINTS } from "../endpoints";

export const applicationService = {
  getMyApplications: async () => {
    const response = await apiClient.get(ENDPOINTS.MY_APPLICATIONS);
    return response.data;
  },

  getApplicationDetails: async (applicationId: string) => {
    const response = await apiClient.get(
      ENDPOINTS.APPLICATION_DETAILS(applicationId),
    );
    return response.data;
  },

  createApplication: async (data: {
    loanId: string;
    requestedAmount: number;
    purpose: string;
    description?: string;
  }) => {
    const response = await apiClient.post(ENDPOINTS.CREATE_APPLICATION, data);
    return response.data;
  },

  updateApplication: async (
    applicationId: string,
    data: Record<string, unknown>,
  ) => {
    const response = await apiClient.put(
      ENDPOINTS.UPDATE_APPLICATION(applicationId),
      data,
    );
    return response.data;
  },

  deleteApplication: async (applicationId: string) => {
    const response = await apiClient.delete(
      ENDPOINTS.DELETE_APPLICATION(applicationId),
    );
    return response.data;
  },
};

export async function createApplication(payload: {
  loanId: string;
  requestedAmount: number;
  purpose: string;
  description?: string;
}) {
  return applicationService.createApplication(payload);
}

export async function getApplications() {
  const response = await applicationService.getMyApplications();
  return response?.data ?? response ?? [];
}
