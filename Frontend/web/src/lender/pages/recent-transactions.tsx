import { useEffect, useState } from 'react'
import { RefreshCw } from 'lucide-react'
import BorrowerSidePanel from '../components/borrowers/BorrowerSidePanel'
import PaymentCsvExport from '../components/payments/PaymentCsvExport'
import type { LenderSession } from '../lib/lender-session'
import { formatInstallmentLabel } from '../lib/payment-format'
import {
  fetchRecentTransactions,
  type RecentTransactionsResponse,
} from '../lib/recent-transactions-api'

const PAGE_SIZE = 15

const currencyFormatter = new Intl.NumberFormat('en-LK', {
  style: 'currency',
  currency: 'LKR',
  maximumFractionDigits: 0,
})

function formatCurrency(value: number): string {
  return currencyFormatter.format(value)
}

function formatLabel(value: string): string {
  return value
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (character) => character.toUpperCase())
}

function formatDateTime(value: string | null): string {
  if (!value) return 'Unknown'
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return 'Unknown'

  return new Intl.DateTimeFormat('en-LK', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(parsed)
}

function getStatusBadgeClass(value: string): string {
  if (value === 'failed' || value === 'reversed') return 'badge-danger'
  if (['paid', 'completed', 'success', 'successful'].includes(value)) {
    return 'badge-success'
  }
  return 'badge-gray'
}

export default function RecentTransactionsPage({
  session,
}: {
  session: LenderSession
}) {
  const [response, setResponse] = useState<RecentTransactionsResponse | null>(
    null,
  )
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState('')
  const [reloadVersion, setReloadVersion] = useState(0)
  const [currentPage, setCurrentPage] = useState(1)
  const [pageCursors, setPageCursors] = useState<Array<string | null>>([null])
  const [selectedBorrowerId, setSelectedBorrowerId] = useState<string | null>(
    null,
  )
  const activeCursor = pageCursors[currentPage - 1] ?? null

  useEffect(() => {
    setCurrentPage(1)
    setPageCursors([null])
    setResponse(null)
    setSearchQuery('')
    setDebouncedSearchQuery('')
  }, [session.lenderId])

  useEffect(() => {
    const handle = window.setTimeout(() => {
      setCurrentPage(1)
      setPageCursors([null])
      setDebouncedSearchQuery(searchQuery.trim())
    }, 600)

    return () => window.clearTimeout(handle)
  }, [searchQuery])

  useEffect(() => {
    let isMounted = true

    async function loadPayments() {
      setIsLoading(true)
      setError(null)

      try {
        const data = await fetchRecentTransactions(session.lenderId, {
          pageSize: PAGE_SIZE,
          cursor: activeCursor,
          includeSummary: false,
          includeSearchCount: false,
          search: debouncedSearchQuery,
        })

        if (isMounted) setResponse(data)
      } catch (loadError) {
        if (isMounted) {
          setError(
            loadError instanceof Error
              ? loadError.message
              : 'Failed to load payments.',
          )
        }
      } finally {
        if (isMounted) setIsLoading(false)
      }
    }

    void loadPayments()
    return () => {
      isMounted = false
    }
  }, [activeCursor, debouncedSearchQuery, reloadVersion, session.lenderId])

  function goToNextPage() {
    const nextCursor = response?.pageInfo.nextCursor
    if (!nextCursor) return

    setPageCursors((current) => [
      ...current.slice(0, currentPage),
      nextCursor,
    ])
    setCurrentPage((page) => page + 1)
  }

  const payments = response?.transactions ?? []
  const visibleStart = payments.length
    ? (currentPage - 1) * PAGE_SIZE + 1
    : 0
  const visibleEnd = payments.length ? visibleStart + payments.length - 1 : 0
  const isSearchPending = searchQuery.trim() !== debouncedSearchQuery

  return (
    <>
      <section className="dashboard-panel">
        <header className="page-header">
          <div>
            <p className="eyebrow">Lender cash flow</p>
            <h1 className="page-title">Payments</h1>
            <p className="page-subtitle">
              Read-only history of completed repayments received for your loans.
              Record new payments from the Loans page.
            </p>
          </div>
          <PaymentCsvExport />
        </header>

        <section className="card pending-requests-card">
          <div className="borrowers-toolbar">
            <div>
              <h2 className="section-title">Payment History</h2>
              <p className="section-subtitle">
                Each row represents one payment—not a duplicate loan record.
              </p>
            </div>

            <div className="pending-requests-toolbar__controls">
              <label className="search-field">
                <span className="search-field__icon" aria-hidden="true">
                  Search
                </span>
                <input
                  className="input"
                  type="search"
                  placeholder="Borrower, payment or installment"
                  value={searchQuery}
                  onChange={(event) => setSearchQuery(event.target.value)}
                  aria-describedby="payments-search-status"
                />
              </label>
              <button
                className="payment-reload-button"
                type="button"
                disabled={isLoading}
                onClick={() => setReloadVersion((version) => version + 1)}
              >
                <RefreshCw
                  aria-hidden="true"
                  className={
                    isLoading ? 'payment-reload-button__icon--spinning' : ''
                  }
                  size={14}
                />
                {isLoading ? 'Reloading' : 'Reload'}
              </button>
              <span
                className="sr-only"
                id="payments-search-status"
                aria-live="polite"
              >
                {isSearchPending
                  ? 'Search will update after 600 milliseconds.'
                  : isLoading
                    ? 'Reloading payment history.'
                    : 'Payment history updated.'}
              </span>
            </div>
          </div>

          <div className="table-container">
            <table className="dashboard-table">
              <thead>
                <tr>
                  <th>Borrower</th>
                  <th>Installment</th>
                  <th>Amount</th>
                  <th>Recorded At</th>
                  <th>Type</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr>
                    <td className="table-empty" colSpan={6}>
                      Loading payments...
                    </td>
                  </tr>
                ) : error ? (
                  <tr>
                    <td className="table-empty" colSpan={6}>
                      {error}
                    </td>
                  </tr>
                ) : payments.length ? (
                  payments.map((payment) => (
                    <tr key={payment.transactionId}>
                      <td>
                        <button
                          type="button"
                          className="borrower-name borrower-name--button"
                          onClick={() => setSelectedBorrowerId(payment.borrowerId)}
                        >
                          {payment.borrowerName}
                        </button>
                      </td>
                      <td>{formatInstallmentLabel(payment.installmentId)}</td>
                      <td>
                        <strong>{formatCurrency(payment.amount)}</strong>
                      </td>
                      <td>{formatDateTime(payment.createdAt)}</td>
                      <td>{formatLabel(payment.type)}</td>
                      <td>
                        <span
                          className={`badge ${getStatusBadgeClass(payment.status)}`}
                        >
                          {formatLabel(payment.status)}
                        </span>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td className="table-empty" colSpan={6}>
                      {debouncedSearchQuery
                        ? 'No payments match the current search.'
                        : 'No completed payments are available yet.'}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="table-footer">
            <p>
              {isLoading
                ? 'Loading the payment list...'
                : `Showing ${visibleStart}-${visibleEnd} payments on page ${currentPage}.`}
            </p>
            <div className="pagination">
              <button
                className="pagination-button"
                type="button"
                disabled={currentPage === 1 || isLoading}
                onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
              >
                Previous
              </button>
              <span className="pagination-status">Page {currentPage}</span>
              <button
                className="pagination-button"
                type="button"
                disabled={!response?.pageInfo.hasMore || isLoading}
                onClick={goToNextPage}
              >
                Next
              </button>
            </div>
          </div>
        </section>
      </section>

      {selectedBorrowerId ? (
        <BorrowerSidePanel
          session={session}
          borrowerId={selectedBorrowerId}
          onClose={() => setSelectedBorrowerId(null)}
        />
      ) : null}
    </>
  )
}
