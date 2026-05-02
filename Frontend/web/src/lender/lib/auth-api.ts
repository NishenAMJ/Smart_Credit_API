const API_BASE_URL =
  (
    import.meta.env.VITE_API_BASE_URL as string | undefined
  )?.replace(/\/$/, "") ?? "/api";

export type LoginPayload = {
  identifier: string;
  password: string;
};

export type RegisterPayload = {
  fullName: string;
  email: string;
  phone: string;
  password: string;
  role: "lender";
};

export type SubmitKycPayload = {
  documentType: string;
  documentNumber: string;
  fullName: string;
  issuingCountry?: string;
  expiryDate?: string;
  documentFrontUrl?: string;
  documentBackUrl?: string;
  selfieUrl?: string;
  profilePictureUrl?: string;
};

export type AuthResponse = {
  accessToken: string;
  user: {
    uid: string;
    email: string;
    fullName: string;
    role: string;
    phone?: string;
    kycStatus?: string;
  };
};

async function parseError(
  response: Response,
  fallbackMessage: string,
): Promise<never> {
  const errorBody = await response.json().catch(() => ({}));
  throw new Error(errorBody.message || fallbackMessage);
}

export async function login(payload: LoginPayload): Promise<AuthResponse> {
  const response = await fetch(`${API_BASE_URL}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    return parseError(response, "Login failed");
  }

  return response.json();
}

export async function register(payload: RegisterPayload): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    return parseError(response, "Registration failed");
  }
}

export async function submitKyc(
  accessToken: string,
  payload: SubmitKycPayload,
): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/kyc/submit`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    return parseError(response, "KYC submission failed");
  }
}
