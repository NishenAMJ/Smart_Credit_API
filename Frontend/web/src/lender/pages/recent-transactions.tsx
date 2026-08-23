import { useEffect, useState } from 'react'
import {
  ArrowDownLeft,
  ArrowUpRight,
  Check,
  Download,
  Eye,
  ExternalLink,
  FileCheck2,
  FileText,
  LoaderCircle,
  LockKeyhole,
  RefreshCw,
  Search,
  X,
} from 'lucide-react'
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

type ReceiptPreview = Awaited<ReturnType<typeof fetchReceiptAccess>>

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
    'payment',
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
  const [openingReceiptId, setOpeningReceiptId] = useState<string | null>(null)
  const [receiptPreview, setReceiptPreview] = useState<ReceiptPreview | null>(
    null,
  )
  const [isDownloadingReceipt, setIsDownloadingReceipt] = useState(false)
  const activeCursor = pageCursors[currentPage - 1] ?? null

  useEffect(() => {
    setCurrentPage(1)
    setPageCursors([null])
    setResponse(null)
    setSearchQuery('')
    setDebouncedSearchQuery('')
    setActivity('payment')
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

  useEffect(() => {
    if (!receiptPreview) return

    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === 'Escape') setReceiptPreview(null)
    }

    window.addEventListener('keydown', closeOnEscape)
    return () => window.removeEventListener('keydown', closeOnEscape)
  }, [receiptPreview])

  async function openReceipt(documentId: string) {
    try {
      setOpeningReceiptId(documentId)
      setReceiptError(null)
      const access = await fetchReceiptAccess(documentId)
      setReceiptPreview(access)
    } catch (openError) {
      setReceiptError(
        openError instanceof Error
          ? openError.message
          : 'Failed to open receipt.',
      )
    } finally {
      setOpeningReceiptId(null)
    }
  }

  async function downloadReceipt() {
    if (!receiptPreview) return

    try {
      setIsDownloadingReceipt(true)
      setReceiptError(null)
      const response = await fetch(receiptPreview.accessUrl)
      if (!response.ok) throw new Error('Failed to download the receipt.')

      const objectUrl = URL.createObjectURL(await response.blob())
      const anchor = document.createElement('a')
      anchor.href = objectUrl
      anchor.download = receiptPreview.fileName || 'bank-transfer-receipt'
      document.body.appendChild(anchor)
      anchor.click()
      anchor.remove()
      URL.revokeObjectURL(objectUrl)
    } catch (downloadError) {
      setReceiptError(
        downloadError instanceof Error
          ? downloadError.message
          : 'Failed to download the receipt.',
      )
    } finally {
      setIsDownloadingReceipt(false)
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
                      disabled={
                        openingReceiptId === submission.receiptDocumentId
                      }
                      onClick={() =>
                        void openReceipt(submission.receiptDocumentId)
                      }
                    >
                      {openingReceiptId === submission.receiptDocumentId ? (
                        <LoaderCircle className="receipt-loading-icon" size={15} />
                      ) : (
                        <Eye size={15} />
                      )}
                      {openingReceiptId === submission.receiptDocumentId
                        ? 'Opening...'
                        : 'View'}
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

        <section className="card pending-requests-card payment-activity-card">
          <div className="borrowers-toolbar">
            <div>
              <h2 className="section-title">Payment activity</h2>
              <p className="section-subtitle">
                Choose whether to review received payments, disbursements, or
                both.
              </p>
            </div>

            <div className="pending-requests-toolbar__controls payment-activity-toolbar">
              <div
                className="payment-activity-filter"
                role="group"
                aria-label="Filter payment activity"
              >
                <button
                  type="button"
                  className={activity === 'all' ? 'is-active' : ''}
                  aria-pressed={activity === 'all'}
                  onClick={() => setActivity('all')}
                >
                  All
                </button>
                <button
                  type="button"
                  className={activity === 'payment' ? 'is-active' : ''}
                  aria-pressed={activity === 'payment'}
                  onClick={() => setActivity('payment')}
                >
                  <ArrowDownLeft size={14} /> Payments
                </button>
                <button
                  type="button"
                  className={activity === 'disbursement' ? 'is-active' : ''}
                  aria-pressed={activity === 'disbursement'}
                  onClick={() => setActivity('disbursement')}
                >
                  <ArrowUpRight size={14} /> Disbursements
                </button>
              </div>
              <label className="payment-activity-search">
                <Search size={16} aria-hidden="true" />
                <span className="sr-only">Search payment activity</span>
                <input
                  type="search"
                  placeholder="Search activity"
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

      {receiptPreview ? (
        <div
          className="dispute-evidence-preview-backdrop"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setReceiptPreview(null)
          }}
        >
          <section
            className="dispute-evidence-preview receipt-document-preview"
            role="dialog"
            aria-modal="true"
            aria-labelledby="receipt-preview-title"
          >
            <header className="dispute-evidence-preview__header">
              <div className="dispute-evidence-preview__identity">
                <span className="dispute-evidence-preview__file-icon">
                  <FileText size={20} />
                </span>
                <div>
                  <span>Bank transfer receipt</span>
                  <h2 id="receipt-preview-title">
                    {receiptPreview.fileName || 'Receipt file'}
                  </h2>
                  <small>Temporary authenticated preview</small>
                </div>
              </div>
              <div className="dispute-evidence-preview__actions">
                <button
                  type="button"
                  className="dispute-evidence-toolbar-button"
                  disabled={isDownloadingReceipt}
                  onClick={() => void downloadReceipt()}
                >
                  {isDownloadingReceipt ? (
                    <LoaderCircle className="receipt-loading-icon" size={17} />
                  ) : (
                    <Download size={17} />
                  )}
                  <span>
                    {isDownloadingReceipt ? 'Downloading...' : 'Download'}
                  </span>
                </button>
                <a
                  className="dispute-evidence-toolbar-button"
                  href={receiptPreview.accessUrl}
                  target="_blank"
                  rel="noreferrer"
                  title="Open receipt in a new tab"
                >
                  <ExternalLink size={17} />
                  <span>Open original</span>
                </a>
                <button
                  type="button"
                  className="dispute-evidence-toolbar-button dispute-evidence-toolbar-button--close"
                  aria-label="Close receipt preview"
                  onClick={() => setReceiptPreview(null)}
                >
                  <X size={18} />
                </button>
              </div>
            </header>
            <div className="dispute-evidence-preview__body">
              {receiptPreview.mimeType.toLowerCase().includes('pdf') ||
              receiptPreview.fileName.toLowerCase().endsWith('.pdf') ? (
                <iframe
                  src={receiptPreview.accessUrl}
                  title={receiptPreview.fileName || 'Bank transfer receipt PDF'}
                />
              ) : (
                <img
                  src={receiptPreview.accessUrl}
                  alt={receiptPreview.fileName || 'Bank transfer receipt'}
                />
              )}
            </div>
            <footer className="dispute-evidence-preview__footer">
              <span>
                <LockKeyhole size={14} /> Secure temporary access
              </span>
              <span>Press Esc to close</span>
            </footer>
          </section>
        </div>
      ) : null}

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
