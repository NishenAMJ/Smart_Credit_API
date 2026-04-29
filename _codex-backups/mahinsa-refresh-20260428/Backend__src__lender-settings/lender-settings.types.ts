export type LenderLandingPage = 'dashboard' | 'analytics';
export type AnalyticsRangeKey = '30d' | '90d' | '365d';

export interface LenderSettingsNotifications {
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
}

export interface LenderSettingsLendingDefaults {
  defaultInterestRate: number;
  defaultMaxTenureMonths: number;
  defaultMinAmount: number;
  defaultMaxAmount: number;
  preferredPurposes: string[];
  preferredRegions: string[];
  defaultResponseTimeHours: number;
}

export interface LenderSettingsWorkspace {
  defaultLandingPage: LenderLandingPage;
  defaultAnalyticsRange: AnalyticsRangeKey;
  pendingRequestsPageSize: number;
  borrowerTablePageSize: number;
}

export interface LenderSettingsResponse {
  lenderId: string;
  notifications: LenderSettingsNotifications;
  lendingDefaults: LenderSettingsLendingDefaults;
  workspace: LenderSettingsWorkspace;
  updatedAt: string | null;
}

export interface UpdateLenderSettingsInput {
  notifications?: Partial<LenderSettingsNotifications>;
  lendingDefaults?: Partial<LenderSettingsLendingDefaults>;
  workspace?: Partial<LenderSettingsWorkspace>;
}
