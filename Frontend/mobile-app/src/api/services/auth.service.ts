/** @format */

import apiClient from "../axios.config";
import { ENDPOINTS } from "../endpoints";
import type {
  AuthResponse,
  DashboardResponse,
  KycSubmissionResponse,
  LegalDocument,
  LegalDocumentResponse,
  LoginPayload,
  MyKycSubmissionResponse,
  RegisterPayload,
  RegisterResponse,
  SessionResponse,
  SubmitKycPayload,
} from "../../types/auth";

export async function login(payload: LoginPayload) {
  const response = await apiClient.post<AuthResponse>(
    ENDPOINTS.auth.login,
    payload,
  );
  return response.data;
}

export async function register(payload: RegisterPayload) {
  const response = await apiClient.post<RegisterResponse>(
    ENDPOINTS.auth.register,
    payload,
  );
  return response.data;
}

export async function getCurrentUser() {
  const response = await apiClient.get<{ user: AuthResponse["user"] }>(
    ENDPOINTS.auth.me,
  );
  return response.data;
}

export async function getSession() {
  const response = await apiClient.get<SessionResponse>(ENDPOINTS.auth.session);
  return response.data;
}

export async function getDashboard(role: "borrower" | "lender") {
  const endpoint =
    role === "borrower"
      ? ENDPOINTS.auth.borrowerDashboard
      : ENDPOINTS.auth.lenderDashboard;
  const response = await apiClient.get<DashboardResponse>(endpoint);
  return response.data;
}

export async function submitKyc(payload: SubmitKycPayload) {
  const response = await apiClient.post<KycSubmissionResponse>(
    ENDPOINTS.kyc.submit,
    payload,
  );
  return response.data;
}

export async function getMyKycSubmission() {
  const response = await apiClient.get<MyKycSubmissionResponse>(
    ENDPOINTS.kyc.mySubmission,
  );
  return response.data;
}

export async function generateLegalDocument(loanId: string) {
  const response = await apiClient.post<LegalDocumentResponse>(
    ENDPOINTS.legal.generate(loanId),
  );
  return response.data;
}

export async function getLatestLegalDocument(loanId: string) {
  const response = await apiClient.get<LegalDocumentResponse>(
    ENDPOINTS.legal.latestByLoan(loanId),
  );
  return response.data;
}

export async function acceptLegalDocument(
  documentId: string,
  payload: { signedName: string },
) {
  const response = await apiClient.post<LegalDocumentResponse>(
    ENDPOINTS.legal.accept(documentId),
    payload,
  );
  return response.data;
}

export async function listLegalDocuments() {
  const response = await apiClient.get<{ documents: LegalDocument[] }>(
    ENDPOINTS.legal.list,
  );
  return response.data;
}
