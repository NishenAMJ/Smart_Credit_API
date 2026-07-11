/** @format */

import apiClient from "../axios.config";
import { ENDPOINTS } from "../endpoints";
import { getUserId } from "../../utils/auth.storage";

export const dashboardService = {
  getDashboard: async () => {
    const userId = await getUserId();
    if (!userId) throw new Error("User session expired. Please log in again.");

    const response = await apiClient.get(ENDPOINTS.dashboard.get(userId));
    return response.data?.data?.data ?? response.data?.data ?? response.data;
  },
};
