import { API_BASE_URL, getAuthHeaders } from './api-config'

export type RecentTransactionsSummary = {
  totalTransactions: number
  totalCollected: number
  loansWithActivity: number
  overdueInstallments: number
}

export type CursorPageInfo = {
  pageSize: number
  hasMore: boolean
  nextCursor: string | null
}

export type RecentTransactionItem = {
  transactionId: string
  loanId: string
  installmentId: string | null
  borrowerId: string
  borrowerName: string
  borrowerEmail: string
  amount: number
  type: string
  status: string
  createdAt: string | null
  loanStatus: string
  remainingAmount: number
  source: 'payment' | 'transaction'
  installmentSummary: {
    totalInstallments: number
    paidInstallments: number
    overdueInstallments: number
    nextDueDate: string | null
    latestInstallmentStatus: string
  }
}

export type RecentTransactionsResponse = {
  lenderId: string
  summary: RecentTransactionsSummary
  searchResultCount: number | null
  transactions: RecentTransactionItem[]
  pageInfo: CursorPageInfo
  generatedAt: string
}

export type LoanLedgerPaymentDetail = {
  id: string
  amount: number
  status: string
  type: string
  createdAt: string | null
  source: 'payment' | 'transaction'
  note: string | null
}

export type LoanLedgerInstallmentDetail = {
  id: string
  status: string
  dueDate: string | null
  amount: number
  paidAmount: number
  payments: LoanLedgerPaymentDetail[]
}

export type LoanLedgerDetailsResponse = {
  lenderId: string
  loan: {
    id: string
    borrowerId: string | null
    status: string
    amount: number
    remainingAmount: number
    interestRate: number
    tenureMonths: number
    createdAt: string | null
  }
  installments: LoanLedgerInstallmentDetail[]
}

export type RecordInstallmentPaymentInput = {
  amount: number
  paidAt?: string | null
  note?: string | null
}

export type FetchRecentTransactionsOptions = {
  pageSize?: number
  cursor?: string | null
  includeSummary?: boolean
  includeSearchCount?: boolean
  search?: string | null
  date?: string | null
}

export type ReceiptSubmission = {
  transactionId: string
  loanId: string
  installmentId: string
  borrowerId: string
  borrowerName: string
  amount: number
  currency: string
  receiptDocumentId: string
  submittedAt: string | null
  status: 'pending_verification'
}

async function parseError(
  response: Response,
  fallback: string,
): Promise<never> {
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

export async function fetchRecentTransactions(
  lenderId: string,
  options: FetchRecentTransactionsOptions = {},
): Promise<RecentTransactionsResponse> {
  const params = new URLSearchParams({
    lenderId,
    pageSize: String(options.pageSize ?? 15),
  })

  if (options.cursor) {
    params.set('cursor', options.cursor)
  }

  if (options.includeSummary === false) {
    params.set('includeSummary', 'false')
  }

  if (options.includeSearchCount === false) {
    params.set('includeSearchCount', 'false')
  }

  if (options.search && options.search.trim().length > 0) {
    params.set('search', options.search.trim())
  }

  if (options.date && options.date.trim().length > 0) {
    params.set('date', options.date.trim())
  }

  const response = await fetch(
    `${API_BASE_URL}/payments?${params.toString()}`,
    { headers: getAuthHeaders() },
  )

  if (!response.ok) {
    return parseError(response, 'Failed to load recent transactions.')
  }

  return response.json()
}

export async function fetchLoanLedgerDetails(
  lenderId: string,
  loanId: string,
): Promise<LoanLedgerDetailsResponse> {
  const response = await fetch(
    `${API_BASE_URL}/payments/loans/${encodeURIComponent(
      loanId,
    )}?lenderId=${encodeURIComponent(lenderId)}`,
    { headers: getAuthHeaders() },
  )

  if (!response.ok) {
    return parseError(response, 'Failed to load loan ledger details.')
  }

  return response.json()
}

export async function fetchPaymentsCsv(
  startDate: string,
  endDate: string,
): Promise<{ blob: Blob; fileName: string }> {
  const params = new URLSearchParams({ startDate, endDate })
  const response = await fetch(
    `${API_BASE_URL}/payments/export?${params.toString()}`,
    { headers: getAuthHeaders() },
  )

  if (!response.ok) {
    return parseError(response, 'Failed to export payments.')
  }

  const disposition = response.headers.get('Content-Disposition') ?? ''
  const fileNameMatch = /filename="?([^";]+)"?/i.exec(disposition)
  return {
    blob: await response.blob(),
    fileName:
      fileNameMatch?.[1] ??
      `smart-credit-payments-${startDate}-to-${endDate}.csv`,
  }
}

export async function recordInstallmentPayment(
  lenderId: string,
  loanId: string,
  installmentId: string,
  input: RecordInstallmentPaymentInput,
): Promise<LoanLedgerDetailsResponse> {
  const response = await fetch(
    `${API_BASE_URL}/payments/loans/${encodeURIComponent(
      loanId,
    )}/installments/${encodeURIComponent(installmentId)}/payments?lenderId=${encodeURIComponent(
      lenderId,
    )}`,
    {
      method: 'POST',
      headers: getAuthHeaders({
        'Content-Type': 'application/json',
      }),
      body: JSON.stringify(input),
    },
  )

  if (!response.ok) {
    return parseError(response, 'Failed to record installment payment.')
  }

  return response.json()
}

export async function fetchReceiptSubmissions(): Promise<ReceiptSubmission[]> {
  const response = await fetch(`${API_BASE_URL}/payments/receipt-submissions`, {
    headers: getAuthHeaders(),
  })
  if (!response.ok) {
    return parseError(response, 'Failed to load receipt submissions.')
  }
  const body = (await response.json()) as { submissions?: ReceiptSubmission[] }
  return body.submissions ?? []
}

export async function decideReceiptSubmission(
  transactionId: string,
  decision: 'approve' | 'reject',
  note?: string,
) {
  const response = await fetch(
    `${API_BASE_URL}/payments/receipt-submissions/${encodeURIComponent(transactionId)}/decision`,
    {
      method: 'POST',
      headers: getAuthHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify({ decision, note: note?.trim() || null }),
    },
  )
  if (!response.ok) {
    return parseError(response, 'Failed to review the receipt.')
  }
  return response.json()
}

export async function fetchReceiptAccess(documentId: string) {
  const response = await fetch(
    `${API_BASE_URL}/documents/${encodeURIComponent(documentId)}/access`,
    { headers: getAuthHeaders() },
  )
  if (!response.ok) {
    return parseError(response, 'Failed to open the receipt.')
  }
  return response.json() as Promise<{ accessUrl: string; expiresAt: string }>
}
