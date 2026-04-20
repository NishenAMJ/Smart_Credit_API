export interface PendingRequestsSummary {
  totalPendingRequests: number;
  targetedRequests: number;
  marketplaceMatches: number;
  highUrgencyRequests: number;
}

export interface PendingRequestListItem {
  requestId: string;
  borrowerId: string;
  borrowerName: string;
  borrowerEmail: string;
  borrowerPhone: string | null;
  borrowerCreditScore: number | null;
  borrowerKycStatus: string;
  amount: number;
  tenureMonths: number;
  purpose: string;
  purposeCategory: string;
  status: string;
  urgency: string;
  suggestedInterestRate: number;
  monthlyIncome: number;
  incomeSource: string;
  requestedRegion: string;
  collateralOffered: boolean;
  targetType: 'targeted' | 'marketplace';
  adId: string | null;
  adTitle: string | null;
  createdAt: string | null;
  updatedAt: string | null;
  notes: string;
  matchedLenderIds: string[];
}

export interface PendingRequestsResponse {
  lenderId: string;
  summary: PendingRequestsSummary;
  requests: PendingRequestListItem[];
  generatedAt: string;
}
