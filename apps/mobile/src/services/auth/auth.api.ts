import type {
  LoginPayload,
  RegisterPayload,
  VerifiedRegistrationPayload,
} from "../../types/auth";
import { apiClient } from "../api/client";

export type OtpPurpose = "login" | "register";

export type StartAuthOtpResponse = {
  success: boolean;
  otpSessionId?: string;
  contact: string;
  purpose: OtpPurpose;
};

export type VerifyOtpPayload = {
  otpCode: string;
  otpSessionId?: string;
  purpose: OtpPurpose;
};

export type VerifyOtpResponse = {
  success: boolean;
  accessToken?: string;
  userId?: string;
  role?: string;
  kycStatus?: string;
  otpVerified?: boolean;
  registrationPayload?: VerifiedRegistrationPayload;
};

export type ResendOtpPayload = {
  otpSessionId: string;
};

export const authApi = {
  login: (payload: LoginPayload) =>
    apiClient.post<StartAuthOtpResponse>("/auth/login", payload),
  register: (payload: RegisterPayload) =>
    apiClient.post<StartAuthOtpResponse>("/auth/register", payload),
  verifyOtp: (payload: VerifyOtpPayload) =>
    apiClient.post<VerifyOtpResponse>("/auth/verify-otp", payload),
  resendOtp: (payload: ResendOtpPayload) =>
    apiClient.post<StartAuthOtpResponse>("/auth/resend-otp", payload),
};
