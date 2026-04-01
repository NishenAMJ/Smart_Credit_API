/** @format */

import apiClient from "../axios.config";
import { ENDPOINTS } from "../endpoints";

export async function login(payload: { email: string; password: string }) {
  const response = await apiClient.post(ENDPOINTS.auth.login, payload);
  return response.data;
}

export async function getCurrentUser() {
  const response = await apiClient.get(ENDPOINTS.auth.me);
  return response.data;
}
