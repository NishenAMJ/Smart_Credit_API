export interface CursorPageInfo {
  pageSize: number;
  hasMore: boolean;
  nextCursor: string | null;
}

export interface CreateLenderAdInput {
  headline: string;
  title?: string;
  description?: string;
  minAmount: number;
  maxAmount: number;
  interestRate: number;
  minTenureMonths?: number;
  tenureMonths: number;
  borrowerFocus: string;
  processingTime: string;
  responseTimeHours?: number;
  repaymentStyle: string;
  requirements: string;
  supportNote: string;
  location?: string;
  preferredPurposes?: string[];
}

export interface LenderAdResponse {
  id: string;
  adId: string;
  lenderId: string;
  title: string;
  description: string;
  borrowerFocus: string;
  processingTime: string;
  repaymentStyle: string;
  requirements: string;
  minAmount: number;
  maxAmount: number;
  preferredInterestRate: number;
  minTenureMonths?: number;
  maxTenureMonths: number;
  location: string;
  preferredPurposes: string[];
  status: string;
  isBoosted: boolean;
  boostStatus: string | null;
  boostStartsAt: string | null;
  boostEndsAt: string | null;
  availableCapital: number;
  applicationCount: number;
  fundedLoansCount: number;
  responseTimeHours: number;
  lenderName: string | null;
  expiresAt: string | null;
  createdAt: string | null;
  updatedAt: string | null;
  searchKeywords: string[];
  seedBatchId: string;
  source: string;
  lenderPhotoURL?: string | null;
  lenderRating?: number;
  imageUrl?: string;
}

export interface LenderAdsListResponse {
  lenderId: string;
  ads: LenderAdResponse[];
  pageInfo: CursorPageInfo;
}

export interface LenderAdAnalyticsResponse {
  adId: string;
  title: string;
  status: string;
  createdAt: string | null;
  expiresAt: string | null;
  applications: {
    total: number;
    submitted: number;
    underReview: number;
    approved: number;
    rejected: number;
    converted: number;
  };
  loans: {
    funded: number;
    active: number;
    overdue: number;
    completed: number;
    defaulted: number;
  };
  fundingRate: number;
}
