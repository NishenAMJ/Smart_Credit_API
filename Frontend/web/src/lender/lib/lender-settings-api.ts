import { fetchLenderApi, parseApiError } from "./api-client";

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

export async function fetchLenderSettings(): Promise<LenderSettings> {
  const response = await fetchLenderApi("/lender-settings/me");

  if (!response.ok) {
    return parseApiError(response, "Failed to load lender settings.");
  }

  return response.json();
}

export async function updateLenderSettings(
  payload: UpdateLenderSettingsPayload,
): Promise<LenderSettings> {
  const response = await fetchLenderApi("/lender-settings/me", {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    return parseApiError(response, "Failed to update lender settings.");
  }

  return response.json();
}
