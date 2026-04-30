/** @format */

import axios from "axios";
import { Platform } from "react-native";

const DEFAULT_PORT = 3000;

function getDefaultApiBaseUrl() {
  if (Platform.OS === "android") {
    return `http://10.0.2.2:${DEFAULT_PORT}`;
  }
  return `http://localhost:${DEFAULT_PORT}`;
}

const apiClient = axios.create({
  baseURL: process.env.EXPO_PUBLIC_API_URL ?? getDefaultApiBaseUrl(),
  timeout: 15000,
  headers: {
    "Content-Type": "application/json",
  },
});

export function setAuthToken(token: string | null) {
  if (token) {
    apiClient.defaults.headers.common.Authorization = `Bearer ${token}`;
    return;
  }

  delete apiClient.defaults.headers.common.Authorization;
}

export default apiClient;
