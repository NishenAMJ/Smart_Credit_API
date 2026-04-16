import { useEffect, useMemo, useState } from 'react'
import type { DashboardOverviewResponse } from '../lib/dashboard-api'

const ITEMS_PER_PAGE = 8
const BORROWER_FETCH_LIMIT = 24
const API_BASE_URL =
  (import.meta.env.VITE_API_BASE_URL as string | undefined)?.replace(/\/$/, '') ??
  'http://localhost:3000'

const currencyFormatter = new Intl.NumberFormat('en-LK', {
  style: 'currency',
  currency: 'LKR',
  maximumFractionDigits: 0,
})

const dateFormatter = new Intl.DateTimeFormat('en-LK', {
  weekday: 'long',
  year: 'numeric',
  month: 'long',
  day: 'numeric',
})

const joinedDateFormatter = new Intl.DateTimeFormat('en-LK', {
  year: 'numeric',
  month: 'short',
  day: 'numeric',
})

function formatCurrency(value: number): string {
  return currencyFormatter.format(value)
}

function formatLabel(value: string): string {
  return value
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (character) => character.toUpperCase())
}

function formatJoinedDate(value: string | null): string {
  if (!value) {
    return 'Unknown'
  }

  const parsed = new Date(value)
  return Number.isNaN(parsed.getTime())
    ? 'Unknown'
    : joinedDateFormatter.format(parsed)
}

async function fetchDashboardOverview(): Promise<DashboardOverviewResponse> {
  const response = await fetch(
    `${API_BASE_URL}/dashboard/overview?limit=${BORROWER_FETCH_LIMIT}`,
  )

  if (!response.ok) {
    throw new Error(`Dashboard request failed with status ${response.status}`)
  }

  return response.json()
}

function getMetricTone(index: number): string {
  const tones = ['primary', 'success', 'warning', 'danger']
  return tones[index] ?? 'primary'
}

export default function DashboardPage() {
  const [overview, setOverview] = useState<DashboardOverviewResponse | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let isMounted = true

    const loadDashboard = async () => {
      try {
        setIsLoading(true)
        setError(null)
        const data = await fetchDashboardOverview()

        if (isMounted) {
          setOverview(data)
        }
      } catch (loadError) {
        if (isMounted) {
          setError(
            loadError instanceof Error
              ? loadError.message
              : 'Failed to load dashboard data.',
          )
        }
      } finally {
        if (isMounted) {
          setIsLoading(false)
        }
      }
    }

    void loadDashboard()

    return () => {
      isMounted = false
    }
  }, [])

  useEffect(() => {
    setCurrentPage(1)
  }, [searchQuery])

  const borrowers = useMemo(
    () => overview?.recentBorrowers ?? [],
    [overview?.recentBorrowers],
  )
  const summary = overview?.summary

  const filteredBorrowers = useMemo(() => {
    const normalizedQuery = searchQuery.trim().toLowerCase()

    if (!normalizedQuery) {
      return borrowers
    }

    return borrowers.filter((borrower) => {
      return (
        borrower.fullName.toLowerCase().includes(normalizedQuery) ||
        borrower.email.toLowerCase().includes(normalizedQuery) ||
        formatLabel(borrower.kycStatus).toLowerCase().includes(normalizedQuery) ||
        String(borrower.creditScore ?? '').includes(normalizedQuery)
      )
    })
  }, [borrowers, searchQuery])

  const totalPages = Math.max(1, Math.ceil(filteredBorrowers.length / ITEMS_PER_PAGE))
  const visibleBorrowers = filteredBorrowers.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE,
  )
  const visibleStart =
    visibleBorrowers.length === 0 ? 0 : (currentPage - 1) * ITEMS_PER_PAGE + 1
  const visibleEnd = Math.min(
    currentPage * ITEMS_PER_PAGE,
    filteredBorrowers.length,
  )

  const summaryCards = [
    {
      label: 'Total Borrowers',
      value: summary ? String(summary.totalBorrowers) : '--',
      caption: 'Registered borrower accounts',
      accent: 'BR',
    },
    {
      label: "Today's Collection",
      value: summary ? formatCurrency(summary.todaysCollection) : '--',
      caption: 'Repayments recorded today',
      accent: 'LKR',
    },
    {
      label: 'Overdue Payments',
      value: summary ? String(summary.overduePayments) : '--',
      caption: 'Installments marked overdue',
      accent: 'OD',
    },
    {
      label: 'Active Ads',
      value: summary ? String(summary.activeAds) : '--',
      caption: 'Approved lender advertisements',
      accent: 'AD',
    },
  ]

  return (
      <section className="dashboard-panel">
        <header className="page-header">
          <div>
            <p className="eyebrow">Lender overview</p>
            <h1 className="page-title">Dashboard</h1>
            <p className="page-subtitle">
              Lender workspace for collections, portfolio health, borrower
              activity, and ad performance from Firebase.
            </p>
          </div>
          <div className="header-date">
            <span className="header-date__label">Today</span>
            <strong>{dateFormatter.format(new Date())}</strong>
          </div>
        </header>

        {isLoading ? (
          <section className="card loading-card">
            <p>Loading dashboard data...</p>
          </section>
        ) : error ? (
          <section className="card error-card">
            <h2>Dashboard data is not available yet</h2>
            <p>{error}</p>
            <p>
              Check whether the Nest API is running and Firebase credentials are
              valid.
            </p>
          </section>
        ) : (
          <>
            <section className="summary-grid" aria-label="Dashboard summary">
              {summaryCards.map((card, index) => (
                <article className="card metric-card" key={card.label}>
                  <div
                    className={`metric-icon metric-icon--${getMetricTone(index)}`}
                    aria-hidden="true"
                  >
                    {card.accent}
                  </div>
                  <div className="metric-copy">
                    <p className="metric-label">{card.label}</p>
                    <p className="metric-value">{card.value}</p>
                    <p className="metric-caption">{card.caption}</p>
                  </div>
                </article>
              ))}
            </section>

            <section className="card borrowers-card">
              <div className="borrowers-toolbar">
                <div>
                  <h2 className="section-title">Recent Borrowers</h2>
                  <p className="section-subtitle">
                    Limited to the latest {borrowers.length} borrowers retrieved
                    from Firestore for a faster first dashboard.
                  </p>
                </div>
                <label className="search-field">
                  <span className="search-field__icon" aria-hidden="true">
                    Search
                  </span>
                  <input
                    className="input"
                    type="search"
                    placeholder="Search name, email, KYC, score"
                    value={searchQuery}
                    onChange={(event) => setSearchQuery(event.target.value)}
                  />
                </label>
              </div>

              <div className="table-container">
                <table className="dashboard-table">
                  <thead>
                    <tr>
                      <th>Borrower</th>
                      <th>Credit Score</th>
                      <th>KYC</th>
                      <th>Active Loans</th>
                      <th>Status</th>
                      <th>Joined</th>
                    </tr>
                  </thead>
                  <tbody>
                    {visibleBorrowers.length > 0 ? (
                      visibleBorrowers.map((borrower) => (
                        <tr key={borrower.id}>
                          <td>
                            <div className="borrower-cell">
                              <span className="borrower-avatar" aria-hidden="true">
                                {borrower.fullName.slice(0, 2).toUpperCase()}
                              </span>
                              <div>
                                <p className="borrower-name">{borrower.fullName}</p>
                                <p className="borrower-email">{borrower.email}</p>
                              </div>
                            </div>
                          </td>
                          <td>{borrower.creditScore ?? 'N/A'}</td>
                          <td>
                            <span className="badge badge-gray">
                              {formatLabel(borrower.kycStatus)}
                            </span>
                          </td>
                          <td>{borrower.activeLoansCount}</td>
                          <td>
                            <span
                              className={`badge ${
                                borrower.isActive ? 'badge-success' : 'badge-danger'
                              }`}
                            >
                              {borrower.isActive ? 'Active' : 'Suspended'}
                            </span>
                          </td>
                          <td>{formatJoinedDate(borrower.createdAt)}</td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td className="table-empty" colSpan={6}>
                          {searchQuery
                            ? `No borrowers found for "${searchQuery}".`
                            : 'No borrower data available yet.'}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              <div className="table-footer">
                <p>
                  Showing {visibleStart}-{visibleEnd} of {filteredBorrowers.length}{' '}
                  borrowers
                </p>

                <div className="pagination">
                  <button
                    type="button"
                    className="pagination-button"
                    onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
                    disabled={currentPage === 1}
                  >
                    Previous
                  </button>

                  <span className="pagination-status">
                    Page {currentPage} of {totalPages}
                  </span>

                  <button
                    type="button"
                    className="pagination-button"
                    onClick={() =>
                      setCurrentPage((page) => Math.min(totalPages, page + 1))
                    }
                    disabled={currentPage === totalPages}
                  >
                    Next
                  </button>
                </div>
              </div>
            </section>
          </>
        )}
      </section>
  )
}
