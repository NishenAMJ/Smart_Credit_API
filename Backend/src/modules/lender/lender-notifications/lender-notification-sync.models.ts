export type LoanRecord = {
  id: string;
  borrowerId: string | null;
  requestId: string | null;
  amount: number;
  remainingAmount: number;
  status: string;
  createdAt: Date | null;
  updatedAt: Date | null;
};

export type RequestRecord = {
  id: string;
  borrowerId: string | null;
  adId: string | null;
  targetLenderId: string | null;
  amount: number;
  status: string;
  urgency: string;
  purpose: string | null;
  matchedLenderIds: string[];
  createdAt: Date | null;
  updatedAt: Date | null;
};

export type TransactionRecord = {
  id: string;
  loanId: string | null;
  type: string;
  amount: number;
  status: string;
  createdAt: Date | null;
};

export type DisputeRecord = {
  id: string;
  loanId: string | null;
  type: string;
  status: string;
  createdAt: Date | null;
  updatedAt: Date | null;
};

export type AdRecord = {
  id: string;
  title: string;
  status: string;
  expiresAt: Date | null;
  createdAt: Date | null;
  updatedAt: Date | null;
};

export type BorrowerProfile = { fullName: string };

export type LenderProfile = {
  fullName: string;
  businessName: string | null;
  email: string;
  city: string | null;
  district: string | null;
  kycStatus: string;
};

export type NotificationGenerationPreferences = {
  inAppNewRequests: boolean;
  inAppTransactions: boolean;
  inAppStatusUpdates: boolean;
  inAppOverdues: boolean;
  inAppAdExpiry: boolean;
  inAppDisputes: boolean;
};
