import { API_BASE_URL, getAuthHeaders } from './api-config'

export type PendingRequestsSummary = {
  totalPendingRequests: number
  targetedRequests: number
  marketplaceMatches: number
  highUrgencyRequests: number
}

export type CursorPageInfo = {
  pageSize: number
  hasMore: boolean
  nextCursor: string | null
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
  pageInfo: CursorPageInfo
  generatedAt: string
}

export type FetchPendingRequestsOptions = {
  limit?: number
  cursor?: string | null
  adId?: string | null
  includeSummary?: boolean
  includeAllStatuses?: boolean
}

export type LoanRequestDecision = 'approve' | 'reject'

export type LoanRequestDecisionResponse = {
  requestId: string
  status: 'approved' | 'rejected'
  updatedAt: string
}

export async function fetchPendingRequests(
  options: number | FetchPendingRequestsOptions = 30,
): Promise<PendingRequestsResponse> {
  const normalizedOptions: FetchPendingRequestsOptions =
    typeof options === 'number' ? { limit: options } : options
  const searchParams = new URLSearchParams({
    limit: String(normalizedOptions.limit ?? 30),
  })

  if (normalizedOptions.cursor) {
    searchParams.set('cursor', normalizedOptions.cursor)
  }

  if (normalizedOptions.adId) {
    searchParams.set('adId', normalizedOptions.adId)
  }

  if (normalizedOptions.includeSummary === false) {
    searchParams.set('includeSummary', 'false')
  }

  if (normalizedOptions.includeAllStatuses === true) {
    searchParams.set('includeAllStatuses', 'true')
  }

  const response = await fetch(
    `${API_BASE_URL}/loan-requests/pending?${searchParams.toString()}`,
    { headers: getAuthHeaders() },
  )

  if (!response.ok) {
    throw new Error(`Pending requests failed with status ${response.status}`)
  }

  return response.json()
}

export async function decideLoanRequest(
  requestId: string,
  decision: LoanRequestDecision,
  note?: string,
): Promise<LoanRequestDecisionResponse> {
  const response = await fetch(
    `${API_BASE_URL}/loan-requests/${encodeURIComponent(requestId)}/decision`,
    {
      method: 'POST',
      headers: getAuthHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify({ decision, note }),
    },
  )

  if (!response.ok) {
    const payload = (await response.json().catch(() => null)) as
      | { message?: string | string[] }
      | null
    const message = Array.isArray(payload?.message)
      ? payload.message.join(' ')
      : payload?.message

    throw new Error(message || `Request decision failed with status ${response.status}`)
  }

  return response.json()
}
