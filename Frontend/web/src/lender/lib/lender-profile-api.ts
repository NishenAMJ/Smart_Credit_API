import { API_BASE_URL, getAuthHeaders } from "./api-config";
import { apiErrorFromResponse } from "../../lib/validation";

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

async function parseError(
  response: Response,
  fallback: string,
): Promise<never> {
  try {
    const body = await response.json();
    throw apiErrorFromResponse(response.status, body, fallback);
  } catch (error) {
    if (error instanceof Error) {
      throw error;
    }

    throw new Error(fallback);
  }
}

export async function fetchLenderProfile(
  lenderId: string,
): Promise<LenderProfile> {
  const response = await fetch(
    `${API_BASE_URL}/lender-profile/${encodeURIComponent(lenderId)}`,
    { headers: getAuthHeaders() },
  );

  if (!response.ok) {
    return parseError(response, "Failed to load lender profile.");
  }

  return response.json();
}

export async function updateLenderProfile(
  lenderId: string,
  payload: UpdateLenderProfilePayload,
): Promise<LenderProfile> {
  const response = await fetch(
    `${API_BASE_URL}/lender-profile/${encodeURIComponent(lenderId)}`,
    {
      method: "PATCH",
      headers: getAuthHeaders({
        "Content-Type": "application/json",
      }),
      body: JSON.stringify(payload),
    },
  );

  if (!response.ok) {
    return parseError(response, "Failed to update lender profile.");
  }

  return response.json();
}
