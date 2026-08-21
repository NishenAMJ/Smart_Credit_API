import { useEffect, useState } from 'react'
import { Check, Eye, FileCheck2, RefreshCw, X } from 'lucide-react'
import BorrowerSidePanel from '../components/borrowers/BorrowerSidePanel'
import PaymentCsvExport from '../components/payments/PaymentCsvExport'
import type { LenderSession } from '../lib/lender-session'
import { formatInstallmentLabel } from '../lib/payment-format'
import {
  fetchRecentTransactions,
  fetchReceiptAccess,
  fetchReceiptSubmissions,
  decideReceiptSubmission,
  type ReceiptSubmission,
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
  const [activity, setActivity] = useState<'all' | 'payment' | 'disbursement'>(
    'all',
  )
  const [reloadVersion, setReloadVersion] = useState(0)
  const [currentPage, setCurrentPage] = useState(1)
  const [pageCursors, setPageCursors] = useState<Array<string | null>>([null])
  const [selectedBorrowerId, setSelectedBorrowerId] = useState<string | null>(
    null,
  )
  const [receiptSubmissions, setReceiptSubmissions] = useState<
    ReceiptSubmission[]
  >([])
  const [receiptError, setReceiptError] = useState<string | null>(null)
  const [reviewingReceiptId, setReviewingReceiptId] = useState<string | null>(
    null,
  )
  const [rejectingReceiptId, setRejectingReceiptId] = useState<string | null>(
    null,
  )
  const [rejectionReason, setRejectionReason] = useState('')
  const activeCursor = pageCursors[currentPage - 1] ?? null

  useEffect(() => {
    setCurrentPage(1)
    setPageCursors([null])
    setResponse(null)
    setSearchQuery('')
    setDebouncedSearchQuery('')
    setActivity('all')
  }, [session.lenderId])

  useEffect(() => {
    setCurrentPage(1)
    setPageCursors([null])
    setResponse(null)
  }, [activity])

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
          activity,
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
  }, [
    activeCursor,
    activity,
    debouncedSearchQuery,
    reloadVersion,
    session.lenderId,
  ])

  useEffect(() => {
    let mounted = true
    fetchReceiptSubmissions()
      .then((items) => mounted && setReceiptSubmissions(items))
      .catch(
        (loadError) =>
          mounted &&
          setReceiptError(
            loadError instanceof Error
              ? loadError.message
              : 'Failed to load receipt submissions.',
          ),
      )
    return () => {
      mounted = false
    }
  }, [reloadVersion, session.lenderId])

  async function openReceipt(documentId: string) {
    try {
      setReceiptError(null)
      const access = await fetchReceiptAccess(documentId)
      window.open(access.accessUrl, '_blank', 'noopener,noreferrer')
    } catch (openError) {
      setReceiptError(
        openError instanceof Error
          ? openError.message
          : 'Failed to open receipt.',
      )
    }
  }

  async function reviewReceipt(
    submission: ReceiptSubmission,
    decision: 'approve' | 'reject',
  ) {
    if (decision === 'reject' && rejectionReason.trim().length < 3) {
      setReceiptError(
        'Enter a clear rejection reason before rejecting the receipt.',
      )
      return
    }
    try {
      setReviewingReceiptId(submission.transactionId)
      setReceiptError(null)
      await decideReceiptSubmission(
        submission.transactionId,
        decision,
        decision === 'reject' ? rejectionReason : undefined,
      )
      setReceiptSubmissions((current) =>
        current.filter(
          (item) => item.transactionId !== submission.transactionId,
        ),
      )
      setRejectingReceiptId(null)
      setRejectionReason('')
      setReloadVersion((version) => version + 1)
    } catch (reviewError) {
      setReceiptError(
        reviewError instanceof Error
          ? reviewError.message
          : 'Failed to review receipt.',
      )
    } finally {
      setReviewingReceiptId(null)
    }
  }

  function goToNextPage() {
    const nextCursor = response?.pageInfo.nextCursor
    if (!nextCursor) return

    setPageCursors((current) => [...current.slice(0, currentPage), nextCursor])
    setCurrentPage((page) => page + 1)
  }

  const payments = response?.transactions ?? []
  const visibleStart = payments.length ? (currentPage - 1) * PAGE_SIZE + 1 : 0
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
              Review completed borrower payments and loan disbursements. Record
              new payments from the Loans page.
            </p>
          </div>
          <PaymentCsvExport />
        </header>

        <section className="card receipt-review-card">
          <div className="receipt-review-card__header">
            <div>
              <p className="eyebrow">Action required</p>
              <h2 className="section-title">Bank transfer receipts</h2>
              <p className="section-subtitle">
                Confirm only after matching the receipt with your bank records.
              </p>
            </div>
            <span className="receipt-review-count">
              <FileCheck2 size={16} /> {receiptSubmissions.length} pending
            </span>
          </div>
          {receiptError ? (
            <p className="receipt-review-error">{receiptError}</p>
          ) : null}
          {receiptSubmissions.length ? (
            <div className="receipt-review-list">
              {receiptSubmissions.map((submission) => (
                <article
                  className="receipt-review-item"
                  key={submission.transactionId}
                >
                  <div className="receipt-review-item__main">
                    <strong>{submission.borrowerName}</strong>
                    <span>
                      {formatInstallmentLabel(submission.installmentId)} ·{' '}
                      {formatDateTime(submission.submittedAt)}
                    </span>
                  </div>
                  <strong className="receipt-review-item__amount">
                    {formatCurrency(submission.amount)}
                  </strong>
                  <div className="receipt-review-item__actions">
                    <button
                      type="button"
                      className="receipt-action-button"
                      onClick={() =>
                        void openReceipt(submission.receiptDocumentId)
                      }
                    >
                      <Eye size={15} /> View
                    </button>
                    <button
                      type="button"
                      className="receipt-action-button receipt-action-button--approve"
                      disabled={reviewingReceiptId === submission.transactionId}
                      onClick={() => void reviewReceipt(submission, 'approve')}
                    >
                      <Check size={15} /> Approve
                    </button>
                    <button
                      type="button"
                      className="receipt-action-button receipt-action-button--reject"
                      disabled={reviewingReceiptId === submission.transactionId}
                      onClick={() =>
                        setRejectingReceiptId(submission.transactionId)
                      }
                    >
                      <X size={15} /> Reject
                    </button>
                  </div>
                  {rejectingReceiptId === submission.transactionId ? (
                    <div className="receipt-reject-form">
                      <label>
                        <span>Reason for rejection</span>
                        <textarea
                          value={rejectionReason}
                          onChange={(event) =>
                            setRejectionReason(event.target.value)
                          }
                          maxLength={500}
                          placeholder="Explain what is unclear or incorrect on this receipt"
                        />
                      </label>
                      <div>
                        <button
                          type="button"
                          className="receipt-action-button"
                          onClick={() => {
                            setRejectingReceiptId(null)
                            setRejectionReason('')
                          }}
                        >
                          Cancel
                        </button>
                        <button
                          type="button"
                          className="receipt-action-button receipt-action-button--reject"
                          disabled={
                            reviewingReceiptId === submission.transactionId
                          }
                          onClick={() =>
                            void reviewReceipt(submission, 'reject')
                          }
                        >
                          Confirm rejection
                        </button>
                      </div>
                    </div>
                  ) : null}
                </article>
              ))}
            </div>
          ) : (
            <div className="receipt-review-empty">
              No bank transfer receipts are waiting for review.
            </div>
          )}
        </section>

        <section className="card pending-requests-card">
          <div className="borrowers-toolbar">
            <div>
              <h2 className="section-title">Payment activity</h2>
              <p className="section-subtitle">
                Choose whether to review received payments, disbursements, or
                both.
              </p>
            </div>

            <div className="pending-requests-toolbar__controls">
              <label className="search-field">
                <span className="search-field__icon">Show</span>
                <select
                  className="input"
                  aria-label="Filter payment activity"
                  value={activity}
                  onChange={(event) =>
                    setActivity(
                      event.target.value as 'all' | 'payment' | 'disbursement',
                    )
                  }
                >
                  <option value="all">All activity</option>
                  <option value="payment">Payments</option>
                  <option value="disbursement">Disbursements</option>
                </select>
              </label>
              <label className="search-field">
                <span className="search-field__icon" aria-hidden="true">
                  Search
                </span>
                <input
                  className="input"
                  type="search"
                  placeholder="Borrower, activity or installment"
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
                          onClick={() =>
                            setSelectedBorrowerId(payment.borrowerId)
                          }
                        >
                          {payment.borrowerName}
                        </button>
                      </td>
                      <td>
                        {payment.type === 'disbursement'
                          ? 'Not applicable'
                          : formatInstallmentLabel(payment.installmentId)}
                      </td>
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
                        ? 'No activity matches the current search.'
                        : activity === 'payment'
                          ? 'No completed payments are available yet.'
                          : activity === 'disbursement'
                            ? 'No completed disbursements are available yet.'
                            : 'No payment activity is available yet.'}
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
                : `Showing ${visibleStart}-${visibleEnd} records on page ${currentPage}.`}
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
