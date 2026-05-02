const API_BASE_URL =
  (import.meta.env.VITE_API_BASE_URL as string | undefined)?.replace(
    /\/$/,
    "",
  ) ?? "http://localhost:3000/api";

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
    const body = (await response.json()) as { message?: string | string[] };
    const message = Array.isArray(body.message)
      ? body.message.join(", ")
      : body.message;
    throw new Error(message || fallback);
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
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    },
  );

  if (!response.ok) {
    return parseError(response, "Failed to update lender profile.");
  }

  return response.json();
}
