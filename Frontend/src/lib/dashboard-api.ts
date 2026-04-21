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

export type DashboardOverviewResponse = {
  summary: DashboardSummary
  recentBorrowers: DashboardBorrower[]
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
  'http://localhost:3000'

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
