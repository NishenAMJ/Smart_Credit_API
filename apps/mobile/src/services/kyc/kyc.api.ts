import { apiClient } from "../api/client";

export type SubmitKycPayload = {
  role: "borrower" | "lender";
  fullName: string;
  email: string;
  phoneNumber: string;
  nic: string;
  birthDate: string;
  passwordHash: string;
  nicFrontUrl: string;
  nicBackUrl: string;
  addressProofNumber: string;
  addressProofUrl: string;
  bankAccountNumber: string;
  bankName: string;
  branchCode: string;
  accountType: string;
  bankDocumentUrl: string;
  profilePhotoUrl: string;
  userId?: string;
};

export const kycApi = {
  submit: (payload: SubmitKycPayload) =>
    apiClient.post<{ success: boolean; kycStatus: string; userId?: string }>(
      "/kyc/submit",
      payload,
    ),
};
