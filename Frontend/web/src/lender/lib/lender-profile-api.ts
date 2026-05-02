import { fetchLenderApi, parseApiError } from "./api-client";

export type LenderProfile = {
  lenderId: string;
  fullName: string;
  email: string;
  phone: string | null;
  address: string | null;
  city: string | null;
  district: string | null;
  businessName: string | null;
  businessRegistrationNo: string | null;
  kycStatus: string;
  responseTimeHours: number;
  preferredRegions: string[];
  availableCapital: number;
  rating: number | null;
  profilePhotoUrl: string | null;
  updatedAt: string | null;
};

export type UpdateLenderProfilePayload = {
  fullName: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  district: string;
  businessName: string;
  responseTimeHours: number;
  preferredRegions: string[];
};

export async function fetchLenderProfile(): Promise<LenderProfile> {
  const response = await fetchLenderApi("/lender-profile/me");

  if (!response.ok) {
    return parseApiError(response, "Failed to load lender profile.");
  }

  return response.json();
}

export async function updateLenderProfile(
  payload: UpdateLenderProfilePayload,
): Promise<LenderProfile> {
  const response = await fetchLenderApi(
    "/lender-profile/me",
    {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    },
  );

  if (!response.ok) {
    return parseApiError(response, "Failed to update lender profile.");
  }

  return response.json();
}
