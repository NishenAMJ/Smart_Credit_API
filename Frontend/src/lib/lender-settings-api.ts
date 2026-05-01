const API_BASE_URL =
  (import.meta.env.VITE_API_BASE_URL as string | undefined)?.replace(
    /\/$/,
    "",
  ) ?? "http://localhost:3000";

export type DefaultLandingPage = "dashboard" | "analytics";
export type DefaultAnalyticsRange = "30d" | "90d" | "365d";

export type LenderSettingsNotifications = {
  inAppNewRequests: boolean;
  emailNewRequests: boolean;
  inAppTransactions: boolean;
  emailTransactions: boolean;
  inAppStatusUpdates: boolean;
  emailStatusUpdates: boolean;
  inAppOverdues: boolean;
  emailOverdues: boolean;
  inAppAdExpiry: boolean;
  emailAdExpiry: boolean;
  inAppDisputes: boolean;
  emailDisputes: boolean;
};

export type LenderSettingsLendingDefaults = {
  defaultInterestRate: number;
  defaultMaxTenureMonths: number;
  defaultMinAmount: number;
  defaultMaxAmount: number;
  preferredPurposes: string[];
  preferredRegions: string[];
  defaultResponseTimeHours: number;
};

export type LenderSettingsWorkspace = {
  defaultLandingPage: DefaultLandingPage;
  defaultAnalyticsRange: DefaultAnalyticsRange;
  pendingRequestsPageSize: number;
  borrowerTablePageSize: number;
};

export type LenderSettings = {
  lenderId: string;
  notifications: LenderSettingsNotifications;
  lendingDefaults: LenderSettingsLendingDefaults;
  workspace: LenderSettingsWorkspace;
  updatedAt: string | null;
};

export type UpdateLenderSettingsPayload = {
  notifications: LenderSettingsNotifications;
  lendingDefaults: LenderSettingsLendingDefaults;
  workspace: LenderSettingsWorkspace;
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

export async function fetchLenderSettings(
  lenderId: string,
): Promise<LenderSettings> {
  const response = await fetch(
    `${API_BASE_URL}/lender-settings/${encodeURIComponent(lenderId)}`,
  );

  if (!response.ok) {
    return parseError(response, "Failed to load lender settings.");
  }

  return response.json();
}

export async function updateLenderSettings(
  lenderId: string,
  payload: UpdateLenderSettingsPayload,
): Promise<LenderSettings> {
  const response = await fetch(
    `${API_BASE_URL}/lender-settings/${encodeURIComponent(lenderId)}`,
    {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    },
  );

  if (!response.ok) {
    return parseError(response, "Failed to update lender settings.");
  }

  return response.json();
}
