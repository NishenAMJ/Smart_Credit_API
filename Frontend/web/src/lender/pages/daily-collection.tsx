import { useEffect, useState } from 'react'
import {
  ArrowLeft,
  Banknote,
  CalendarDays,
  Landmark,
  ReceiptText,
} from 'lucide-react'
import type { LenderView } from '../components/common/LenderSidebar'
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

function getLocalDateValue(date = new Date()): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Colombo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date)
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]))
  return `${values.year}-${values.month}-${values.day}`
}

function formatCurrency(value: number): string {
  return currencyFormatter.format(value)
}

function formatLabel(value: string): string {
  return value
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (character) => character.toUpperCase())
}

function formatSelectedDate(value: string): string {
  const date = new Date(`${value}T00:00:00`)
  return new Intl.DateTimeFormat('en-LK', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }).format(date)
}

function formatPaymentTime(value: string | null): string {
  if (!value) return 'Unknown'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return 'Unknown'

  return new Intl.DateTimeFormat('en-LK', {
    hour: '2-digit',
    minute: '2-digit',
  }).format(date)
}

type DailyCollectionPageProps = {
  session: LenderSession
  onNavigate: (view: LenderView) => void
}

export default function DailyCollectionPage({
  session,
  onNavigate,
}: DailyCollectionPageProps) {
  const [selectedDate, setSelectedDate] = useState(getLocalDateValue)
  const [response, setResponse] = useState<RecentTransactionsResponse | null>(
    null,
  )
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [reloadVersion, setReloadVersion] = useState(0)
  const [currentPage, setCurrentPage] = useState(1)
  const [pageCursors, setPageCursors] = useState<Array<string | null>>([null])
  const activeCursor = pageCursors[currentPage - 1] ?? null

  useEffect(() => {
    setCurrentPage(1)
    setPageCursors([null])
    setResponse(null)
  }, [session.lenderId])

  useEffect(() => {
    let isMounted = true

    async function loadCollection() {
      setIsLoading(true)
      setError(null)

      try {
        const data = await fetchRecentTransactions(session.lenderId, {
          pageSize: PAGE_SIZE,
          cursor: activeCursor,
          includeSummary: true,
          includeSearchCount: false,
          date: selectedDate,
          activity: 'payment',
        })

        if (isMounted) setResponse(data)
      } catch (loadError) {
        if (isMounted) {
          setError(
            loadError instanceof Error
              ? loadError.message
              : 'Failed to load the daily collection.',
          )
        }
      } finally {
        if (isMounted) setIsLoading(false)
      }
    }

    void loadCollection()
    return () => {
      isMounted = false
    }
  }, [activeCursor, reloadVersion, selectedDate, session.lenderId])

  function handleDateChange(value: string) {
    setSelectedDate(value)
    setCurrentPage(1)
    setPageCursors([null])
    setResponse(null)
  }

  function goToNextPage() {
    const nextCursor = response?.pageInfo.nextCursor
    if (!nextCursor) return

    setPageCursors((current) => [
      ...current.slice(0, currentPage),
      nextCursor,
    ])
    setCurrentPage((page) => page + 1)
  }

  const transactions = response?.transactions ?? []

  return (
    <section className="dashboard-panel">
      <header className="page-header daily-collection-header">
        <div>
          <button
            className="page-back-button"
            type="button"
            onClick={() => onNavigate('dashboard')}
          >
            <ArrowLeft size={17} /> Dashboard
          </button>
          <p className="eyebrow">Lender cash flow</p>
          <h1 className="page-title">Daily Collection</h1>
          <p className="page-subtitle">
            Completed repayments received on {formatSelectedDate(selectedDate)}.
          </p>
        </div>

        <div className="daily-collection-header__tools">
          <div className="daily-collection-date-control">
            <label htmlFor="daily-collection-date">Collection date</label>
            <div className="daily-collection-date-input">
              <CalendarDays size={18} aria-hidden="true" />
              <input
                id="daily-collection-date"
                type="date"
                value={selectedDate}
                onChange={(event) => handleDateChange(event.target.value)}
              />
            </div>
          </div>
          <PaymentCsvExport
            defaultStartDate={selectedDate}
            defaultEndDate={selectedDate}
          />
        </div>
      </header>

      <section
        className="summary-grid daily-collection-summary"
        aria-label="Daily collection summary"
      >
        {[
          {
            label: 'Collected',
            value: response ? formatCurrency(response.summary.totalCollected) : '--',
            icon: Banknote,
            tone: 'success',
          },
          {
            label: 'Payments',
            value: response ? String(response.summary.totalTransactions) : '--',
            icon: ReceiptText,
            tone: 'primary',
          },
          {
            label: 'Loans Paid',
            value: response ? String(response.summary.loansWithActivity) : '--',
            icon: Landmark,
            tone: 'warning',
          },
        ].map((item) => (
          <article className="card metric-card" key={item.label}>
            <div className={`metric-icon metric-icon--${item.tone}`}>
              <item.icon size={22} strokeWidth={1.8} />
            </div>
            <div className="metric-copy">
              <p className="metric-label">{item.label}</p>
              <p className="metric-value">{item.value}</p>
            </div>
          </article>
        ))}
      </section>

      <section className="card borrowers-card">
        <div className="borrowers-toolbar">
          <div>
            <h2 className="section-title">Collected Payments</h2>
            <p className="section-subtitle">
              Each row is one completed installment repayment received on the
              selected date.
            </p>
          </div>
          <button
            className="pagination-button"
            type="button"
            disabled={isLoading}
            onClick={() => setReloadVersion((version) => version + 1)}
          >
            {isLoading ? 'Reloading...' : 'Reload'}
          </button>
        </div>

        <div className="table-container">
          <table className="dashboard-table">
            <thead>
              <tr>
                <th>Borrower</th>
                <th>Installment</th>
                <th>Amount</th>
                <th>Time</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td className="table-empty" colSpan={5}>
                    Loading daily collection...
                  </td>
                </tr>
              ) : error ? (
                <tr>
                  <td className="table-empty" colSpan={5}>
                    {error}
                  </td>
                </tr>
              ) : transactions.length ? (
                transactions.map((transaction) => (
                  <tr key={transaction.transactionId}>
                    <td>
                      <div className="dashboard-table__stack">
                        <strong>{transaction.borrowerName}</strong>
                        <span className="dashboard-table__subcopy">
                          {transaction.borrowerEmail}
                        </span>
                      </div>
                    </td>
                    <td>{formatInstallmentLabel(transaction.installmentId)}</td>
                    <td>
                      <strong>{formatCurrency(transaction.amount)}</strong>
                    </td>
                    <td>{formatPaymentTime(transaction.createdAt)}</td>
                    <td>
                      <span className="badge badge-success">
                        {formatLabel(transaction.status)}
                      </span>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td className="table-empty" colSpan={5}>
                    No payments were collected on this date.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="table-footer">
          <p>Page {currentPage}</p>
          <div className="pagination">
            <button
              className="pagination-button"
              type="button"
              disabled={currentPage === 1 || isLoading}
              onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
            >
              Previous
            </button>
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
  )
}
