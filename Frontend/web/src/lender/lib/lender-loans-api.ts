import { API_BASE_URL, getAuthHeaders } from './api-config'

export type LenderLoan = {
  id: string
  applicationId: string | null
  listingId: string | null
  borrower: {
    id: string
    fullName: string
    email: string
  }
  currency: string
  principal: number
  totalRepayable: number
  monthlyInstallment: number
  amountPaid: number
  remainingBalance: number
  annualInterestRate: number
  tenureMonths: number
  status: string
  disbursedAt: string | null
  maturityDate: string | null
  createdAt: string | null
}

export type LenderLoansResponse = {
  summary: {
    totalLoans: number
    activeLoans: number
    overdueLoans: number
    completedLoans: number
    totalPrincipal: number
    outstandingBalance: number
  }
  loans: LenderLoan[]
  pageInfo: {
    pageSize: number
    hasMore: boolean
    nextCursor: string | null
  }
  generatedAt: string
}

async function parseError(response: Response): Promise<never> {
  try {
    const body = (await response.json()) as { message?: string | string[] }
    const message = Array.isArray(body.message)
      ? body.message.join(', ')
      : body.message
    throw new Error(message || 'Failed to load lender loans.')
  } catch (error) {
    throw error instanceof Error
      ? error
      : new Error('Failed to load lender loans.')
  }
}

export async function fetchLenderLoans(options: {
  pageSize?: number
  cursor?: string | null
  status?: string
  search?: string
} = {}): Promise<LenderLoansResponse> {
  const params = new URLSearchParams({
    pageSize: String(options.pageSize ?? 15),
  })

  if (options.cursor) params.set('cursor', options.cursor)
  if (options.status) params.set('status', options.status)
  if (options.search?.trim()) params.set('search', options.search.trim())

  const response = await fetch(`${API_BASE_URL}/lender/loans?${params}`, {
    headers: getAuthHeaders(),
  })

  if (!response.ok) return parseError(response)
  return response.json()
}
