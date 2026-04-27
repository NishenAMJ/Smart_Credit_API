/** @format */

import axios from "axios";
import { DeviceEventEmitter } from "react-native";
import { getApiBaseUrl } from "./base-url";
import { getToken, clearAuthStorage } from "../utils/auth.storage";

// Shared Axios client for all API calls.

const apiClient = axios.create({
  baseURL: getApiBaseUrl(),
  timeout: 15000,
  headers: {
    "Content-Type": "application/json",
  },
});

// Add auth token automatically when available.

apiClient.interceptors.request.use(
  async (config) => {
    const token = await getToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error),
);

// If the token is invalid/expired, clear session and notify the app.

apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      await clearAuthStorage();
      // Let the app decide how to redirect (usually back to Login).
      DeviceEventEmitter.emit("unauthorized");
    }
    return Promise.reject(error);
  },
);

export default apiClient;
