import type { LenderSettings } from "./lender-settings-api";

const DEFAULT_NOTIFICATION_SETTINGS = {
  inAppNewRequests: true,
  emailNewRequests: false,
  inAppTransactions: true,
  emailTransactions: false,
  inAppStatusUpdates: true,
  emailStatusUpdates: false,
  inAppOverdues: true,
  emailOverdues: false,
  inAppAdExpiry: true,
  emailAdExpiry: false,
  inAppDisputes: true,
  emailDisputes: false,
} as const;

const DEFAULT_LENDING_SETTINGS = {
  defaultInterestRate: 14.5,
  defaultMaxTenureMonths: 12,
  defaultMinAmount: 50000,
  defaultMaxAmount: 250000,
  preferredPurposes: [] as string[],
  preferredRegions: [] as string[],
  defaultResponseTimeHours: 24,
} as const;

const DEFAULT_WORKSPACE_SETTINGS = {
  defaultLandingPage: "dashboard" as const,
  defaultAnalyticsRange: "90d" as const,
  pendingRequestsPageSize: 30,
  borrowerTablePageSize: 8,
} as const;

export function createDefaultLenderSettings(lenderId: string): LenderSettings {
  return {
    lenderId,
    notifications: { ...DEFAULT_NOTIFICATION_SETTINGS },
    lendingDefaults: {
      ...DEFAULT_LENDING_SETTINGS,
      preferredPurposes: [...DEFAULT_LENDING_SETTINGS.preferredPurposes],
      preferredRegions: [...DEFAULT_LENDING_SETTINGS.preferredRegions],
    },
    workspace: { ...DEFAULT_WORKSPACE_SETTINGS },
    updatedAt: null,
  };
}
