const API_BASE_URL =
  (import.meta.env.VITE_API_BASE_URL as string | undefined)?.replace(/\/$/, '') ??
  'http://localhost:3000'

export type PendingRequestsSummary = {
  totalPendingRequests: number
  targetedRequests: number
  marketplaceMatches: number
  highUrgencyRequests: number
}

export type PendingRequest = {
  requestId: string
  borrowerId: string
  borrowerName: string
  borrowerEmail: string
  borrowerPhone: string | null
  borrowerCreditScore: number | null
  borrowerKycStatus: string
  amount: number
  tenureMonths: number
  purpose: string
  purposeCategory: string
  status: string
  urgency: string
  suggestedInterestRate: number
  monthlyIncome: number
  incomeSource: string
  requestedRegion: string
  collateralOffered: boolean
  targetType: 'targeted' | 'marketplace'
  adId: string | null
  adTitle: string | null
  createdAt: string | null
  updatedAt: string | null
  notes: string
  matchedLenderIds: string[]
}

export type PendingRequestsResponse = {
  lenderId: string
  summary: PendingRequestsSummary
  requests: PendingRequest[]
  generatedAt: string
}

export async function fetchPendingRequests(
  lenderId: string,
  limit = 30,
): Promise<PendingRequestsResponse> {
  const response = await fetch(
    `${API_BASE_URL}/loan-requests/pending?lenderId=${encodeURIComponent(
      lenderId,
    )}&limit=${limit}`,
  )

  if (!response.ok) {
    throw new Error(`Pending requests failed with status ${response.status}`)
  }

  return response.json()
}
