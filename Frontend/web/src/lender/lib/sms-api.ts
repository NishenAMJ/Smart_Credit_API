import { API_BASE_URL, getAuthHeaders } from "./api-config";

export type SmsSettings = {
  enabled: boolean;
  configured: boolean;
  sender: string | null;
  updatedAt: string | null;
};

export type SmsBorrower = {
  borrowerId: string;
  fullName: string;
  email: string;
  phone: string;
};

export type SmsDeliveryResult = {
  borrowerId: string;
  phone: string;
  status: "sent" | "failed";
  providerMessageId: string | null;
  error: string | null;
};

export type SendSmsResponse = {
  attempted: number;
  sent: number;
  failed: number;
  results: SmsDeliveryResult[];
};

async function parseResponse<T>(
  response: Response,
  fallback: string,
): Promise<T> {
  if (response.ok) return response.json();

  const payload = (await response.json().catch(() => null)) as {
    message?: string | string[];
  } | null;
  const message = Array.isArray(payload?.message)
    ? payload.message.join(" ")
    : payload?.message;
  throw new Error(message || fallback);
}

export async function fetchSmsSettings(): Promise<SmsSettings> {
  const response = await fetch(`${API_BASE_URL}/lender/sms/settings`, {
    headers: getAuthHeaders(),
  });
  return parseResponse(response, "Failed to load SMS settings.");
}

export async function updateSmsEnabled(enabled: boolean): Promise<SmsSettings> {
  const response = await fetch(`${API_BASE_URL}/lender/sms/settings`, {
    method: "PATCH",
    headers: getAuthHeaders({ "Content-Type": "application/json" }),
    body: JSON.stringify({ enabled }),
  });
  return parseResponse(response, "Failed to update SMS settings.");
}

export async function searchSmsBorrowers(
  search: string,
): Promise<SmsBorrower[]> {
  const params = new URLSearchParams({ search, limit: "30" });
  const response = await fetch(
    `${API_BASE_URL}/lender/sms/borrowers?${params.toString()}`,
    { headers: getAuthHeaders() },
  );
  const payload = await parseResponse<{ borrowers: SmsBorrower[] }>(
    response,
    "Failed to search borrowers.",
  );
  return payload.borrowers;
}

export async function sendBorrowerSms(
  borrowerIds: string[],
  message: string,
): Promise<SendSmsResponse> {
  const response = await fetch(`${API_BASE_URL}/lender/sms/send`, {
    method: "POST",
    headers: getAuthHeaders({ "Content-Type": "application/json" }),
    body: JSON.stringify({ borrowerIds, message }),
  });
  return parseResponse(response, "Failed to send SMS messages.");
}
