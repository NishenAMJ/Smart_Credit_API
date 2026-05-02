/** @format */

import axios from "axios";
import { getApiBaseUrl } from "../api/base-url";
import { toApiError } from "../api/api-error";

// Cast AxiosInstance to have unwrapped types since interceptor returns response.data
const _api = axios.create({
  baseURL: getApiBaseUrl(),
  timeout: 15000,
  headers: {
    "Content-Type": "application/json",
  },
});

// Attach user ID to every request dynamically
_api.interceptors.request.use((config) => {
  if (typeof _currentUserId !== "undefined") {
    config.headers["x-user-id"] = _currentUserId;
  }
  return config;
});

// Transform AxiosResponse -> data via interceptor
_api.interceptors.response.use(
  (response) => response.data,
  (error) => Promise.reject(toApiError(error)),
);

export const api = _api as unknown as {
  get<T = any>(url: string, config?: any): Promise<T>;
  post<T = any>(url: string, data?: any, config?: any): Promise<T>;
  put<T = any>(url: string, data?: any, config?: any): Promise<T>;
  patch<T = any>(url: string, data?: any, config?: any): Promise<T>;
  delete<T = any>(url: string, config?: any): Promise<T>;
};

export const API_BASE_URL = getApiBaseUrl();

let _currentUserId = "lender_001";

export function setAuthToken(token: string | null) {
  if (token) {
    (_api.defaults.headers as any).common.Authorization = `Bearer ${token}`;
    return;
  }
  delete (_api.defaults.headers as any).common.Authorization;
}

export function getCurrentUserId(): string {
  return _currentUserId;
}

export function setCurrentUserId(userId: string | null | undefined) {
  _currentUserId =
    typeof userId === "string" && userId.trim().length > 0
      ? userId.trim()
      : "lender_001";
}

export type ApiResponse<T = any> = T;
