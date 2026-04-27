/** @format */

import apiClient from "../axios.config";
import { ENDPOINTS } from "../endpoints";
import { saveAuthSession, clearAuthStorage } from "../../utils/auth.storage";

// Request/response types

export interface LoginPayload {
  email: string;
  password: string;
}

export interface RegisterPayload {
  fullName: string;
  email: string;
  password: string;
  phone: string;
  role: "borrower" | "lender";
}

export interface AuthResponse {
  accessToken: string;
  userId: string;
  role: "borrower" | "lender" | "admin";
  fullName: string;
  email: string;
}

// Auth API helpers

export const authService = {
  /**
   * Logs in the user and stores session data locally.
   */
  login: async (payload: LoginPayload): Promise<AuthResponse> => {
    const response = await apiClient.post<AuthResponse>(
      ENDPOINTS.auth.login,
      payload,
    );
    const { accessToken, userId, role } = response.data;
    await saveAuthSession({ token: accessToken, userId, role });
    return response.data;
  },

  /**
   * Registers a user and stores session data right away.
   */
  register: async (payload: RegisterPayload): Promise<AuthResponse> => {
    const response = await apiClient.post<AuthResponse>(
      ENDPOINTS.auth.register,
      payload,
    );
    const { accessToken, userId, role } = response.data;
    await saveAuthSession({ token: accessToken, userId, role });
    return response.data;
  },

  /**
   * Fetches the current authenticated user profile.
   */
  getCurrentUser: async (): Promise<AuthResponse> => {
    const response = await apiClient.get<AuthResponse>(ENDPOINTS.auth.me);
    return response.data;
  },

  /**
   * Logs out server-side (if possible) and always clears local session.
   */
  logout: async (): Promise<void> => {
    try {
      await apiClient.post(ENDPOINTS.auth.logout);
    } finally {
      await clearAuthStorage();
    }
  },
};
