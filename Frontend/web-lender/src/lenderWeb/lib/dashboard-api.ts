export type DashboardSummary = {
  totalBorrowers: number
  todaysCollection: number
  overduePayments: number
  activeAds: number
}

export type DashboardBorrower = {
  id: string
  fullName: string
  email: string
  creditScore: number | null
  kycStatus: string
  loanCount: number
  activeLoansCount: number
  totalBorrowedAmount: number
  outstandingAmount: number
  latestLoanStatus: string
  latestLoanCreatedAt: string | null
  isActive: boolean
  createdAt: string | null
}

export type DashboardSummaryResponse = {
  summary: DashboardSummary
  generatedAt: string
}

export type CursorPageInfo = {
  pageSize: number
  hasMore: boolean
  nextCursor: string | null
}

export type DashboardBorrowersResponse = {
  borrowers: DashboardBorrower[]
  pageInfo: CursorPageInfo
  generatedAt: string
}

export type BorrowerDetails = {
  id: string
  role: string
  fullName: string
  email: string
  phone: string | null
  address: string | null
  nic: string | null
  kycStatus: string
  creditScore: number | null
  rating: number | null
  loanCount: number
  activeLoansCount: number
  totalBorrowedAmount: number
  outstandingAmount: number
  isActive: boolean
  createdAt: string | null
  loans: BorrowerLoan[]
}

export type BorrowerLoan = {
  id: string
  status: string
  amount: number
  remainingAmount: number
  interestRate: number
  tenureMonths: number
  createdAt: string | null
}

const API_BASE_URL =
  (import.meta.env.VITE_API_BASE_URL as string | undefined)?.replace(/\/$/, '') ??
  'http://localhost:3000/api'

async function parseError(response: Response, fallback: string): Promise<never> {
  try {
    const body = (await response.json()) as { message?: string | string[] }
    const message = Array.isArray(body.message)
      ? body.message.join(', ')
      : body.message
    throw new Error(message || fallback)
  } catch (error) {
    if (error instanceof Error) {
      throw error
    }

    throw new Error(fallback)
  }
}

export async function fetchDashboardSummary(
  lenderId: string,
): Promise<DashboardSummaryResponse> {
  const response = await fetch(
    `${API_BASE_URL}/dashboard/summary?lenderId=${encodeURIComponent(lenderId)}`,
  )

  if (!response.ok) {
    return parseError(response, 'Failed to load dashboard summary.')
  }

  return response.json()
}

export async function fetchDashboardBorrowers(
  lenderId: string,
  options: {
    pageSize?: number
    cursor?: string | null
  } = {},
): Promise<DashboardBorrowersResponse> {
  const params = new URLSearchParams({
    lenderId,
    pageSize: String(options.pageSize ?? 8),
  })

  if (options.cursor) {
    params.set('cursor', options.cursor)
  }

  const response = await fetch(
    `${API_BASE_URL}/dashboard/borrowers?${params.toString()}`,
  )

  if (!response.ok) {
    return parseError(response, 'Failed to load dashboard borrowers.')
  }

  return response.json()
}

export async function fetchBorrowerDetails(
  lenderId: string,
  borrowerId: string,
): Promise<BorrowerDetails> {
  const response = await fetch(
    `${API_BASE_URL}/dashboard/borrowers/${borrowerId}?lenderId=${encodeURIComponent(
      lenderId,
    )}`,
  )

  if (!response.ok) {
    return parseError(response, 'Failed to load borrower details.')
  }

  return response.json()
}
