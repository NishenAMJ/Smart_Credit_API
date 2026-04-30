import { useEffect, useMemo, useState } from 'react'
import type { LenderView } from '../components/common/LenderSidebar'
import type {
  AnalyticsDrilldownResponse,
  AnalyticsBreakdownPoint,
  AnalyticsOverviewResponse,
  AnalyticsSummaryResponse,
  AnalyticsTrendPoint,
} from '../lib/analytics-api'
import type { LenderSession } from '../lib/lender-session'

const API_BASE_URL =
  (import.meta.env.VITE_API_BASE_URL as string | undefined)?.replace(/\/$/, '') ??
  'http://localhost:3000'

const RANGE_OPTIONS = [
  { key: '30d', label: '30 Days' },
  { key: '90d', label: '90 Days' },
  { key: '365d', label: '12 Months' },
] as const

const currencyFormatter = new Intl.NumberFormat('en-LK', {
  style: 'currency',
  currency: 'LKR',
  maximumFractionDigits: 0,
})

const percentFormatter = new Intl.NumberFormat('en-LK', {
  style: 'percent',
  maximumFractionDigits: 0,
})

function formatCurrency(value: number): string {
  return currencyFormatter.format(value)
}

function formatPercent(value: number): string {
  return percentFormatter.format(value)
}

function formatShortDate(value: string | null): string {
  if (!value) {
    return 'Unknown'
  }

  const parsed = new Date(value)

  return Number.isNaN(parsed.getTime())
    ? 'Unknown'
    : new Intl.DateTimeFormat('en-LK', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      }).format(parsed)
}

function formatLabel(value: string): string {
  return value
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (character) => character.toUpperCase())
}

async function fetchAnalyticsOverview(
  lenderId: string,
  range: string,
): Promise<AnalyticsOverviewResponse> {
  const response = await fetch(
    `${API_BASE_URL}/analytics/overview?lenderId=${encodeURIComponent(
      lenderId,
    )}&range=${encodeURIComponent(range)}`,
  )

  if (!response.ok) {
    throw new Error(`Analytics request failed with status ${response.status}`)
  }

  return response.json()
}

async function fetchAnalyticsSummary(
  lenderId: string,
  range: string,
): Promise<AnalyticsSummaryResponse> {
  const response = await fetch(
    `${API_BASE_URL}/analytics/summary?lenderId=${encodeURIComponent(
      lenderId,
    )}&range=${encodeURIComponent(range)}`,
  )

  if (!response.ok) {
    throw new Error(`Analytics summary failed with status ${response.status}`)
  }

  return response.json()
}

async function fetchAnalyticsDrilldown(
  lenderId: string,
  type: string,
  range: string,
): Promise<AnalyticsDrilldownResponse> {
  const response = await fetch(
    `${API_BASE_URL}/analytics/drilldown?lenderId=${encodeURIComponent(
      lenderId,
    )}&type=${encodeURIComponent(type)}&range=${encodeURIComponent(range)}`,
  )

  if (!response.ok) {
    throw new Error(`Analytics drilldown failed with status ${response.status}`)
  }

  return response.json()
}

function TrendBars({
  data,
  colorClassName,
}: {
  data: AnalyticsTrendPoint[]
  colorClassName: string
}) {
  const maxValue = Math.max(...data.map((point) => point.value), 1)

  return (
    <div className="analytics-bars">
      {data.map((point) => (
        <div className="analytics-bars__item" key={point.label}>
          <div className="analytics-bars__track">
            <div
              className={`analytics-bars__fill ${colorClassName}`}
              style={{
                height: `${Math.max((point.value / maxValue) * 100, point.value > 0 ? 12 : 0)}%`,
              }}
            />
          </div>
          <p className="analytics-bars__value">{formatCurrency(point.value)}</p>
          <p className="analytics-bars__label">{point.label}</p>
        </div>
      ))}
    </div>
  )
}

function StatusBreakdown({
  data,
}: {
  data: AnalyticsBreakdownPoint[]
}) {
  const total = data.reduce((sum, item) => sum + item.value, 0)

  return (
    <div className="analytics-status-list">
      {data.length > 0 ? (
        data.map((item) => {
          const width = total > 0 ? (item.value / total) * 100 : 0

          return (
            <div className="analytics-status-list__item" key={item.label}>
              <div className="analytics-status-list__header">
                <span>{formatLabel(item.label)}</span>
                <strong>{item.value}</strong>
              </div>
              <div className="analytics-status-list__track">
                <div
                  className="analytics-status-list__fill"
                  style={{ width: `${width}%` }}
                />
              </div>
            </div>
          )
        })
      ) : (
        <p className="analytics-empty-copy">No loan status data yet.</p>
      )}
    </div>
  )
}

type AnalyticsPageProps = {
  session: LenderSession
  onNavigate: (view: LenderView) => void
}

export default function AnalyticsPage({ session, onNavigate }: AnalyticsPageProps) {
  const [selectedRange, setSelectedRange] =
    useState<(typeof RANGE_OPTIONS)[number]['key']>('90d')
  const [summaryData, setSummaryData] = useState<AnalyticsSummaryResponse | null>(null)
  const [overview, setOverview] = useState<AnalyticsOverviewResponse | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isOverviewLoading, setIsOverviewLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [drilldownType, setDrilldownType] = useState<string | null>(null)
  const [drilldown, setDrilldown] = useState<AnalyticsDrilldownResponse | null>(null)
  const [isDrilldownLoading, setIsDrilldownLoading] = useState(false)
  const [drilldownError, setDrilldownError] = useState<string | null>(null)

  useEffect(() => {
    let isMounted = true

    const loadAnalytics = async () => {
      try {
        setIsLoading(true)
        setIsOverviewLoading(false)
        setError(null)
        setSummaryData(null)
        setOverview(null)
        const data = await fetchAnalyticsSummary(session.lenderId, selectedRange)

        if (isMounted) {
          setSummaryData(data)
        }
      } catch (loadError) {
        if (isMounted) {
          setError(
            loadError instanceof Error
              ? loadError.message
              : 'Failed to load analytics data.',
          )
        }
      } finally {
        if (isMounted) {
          setIsLoading(false)
        }
      }
    }

    void loadAnalytics()

    return () => {
      isMounted = false
    }
  }, [selectedRange, session.lenderId])

  useEffect(() => {
    if (!summaryData) {
      return
    }

    let isMounted = true

    const loadOverview = async () => {
      try {
        setIsOverviewLoading(true)
        const data = await fetchAnalyticsOverview(session.lenderId, selectedRange)

        if (isMounted) {
          setOverview(data)
        }
      } catch {
        if (isMounted) {
          setOverview(null)
        }
      } finally {
        if (isMounted) {
          setIsOverviewLoading(false)
        }
      }
    }

    void loadOverview()

    return () => {
      isMounted = false
    }
  }, [selectedRange, session.lenderId, summaryData])

  useEffect(() => {
    if (!drilldownType) {
      return
    }

    let isMounted = true

    const loadDrilldown = async () => {
      try {
        setIsDrilldownLoading(true)
        setDrilldownError(null)
        const data = await fetchAnalyticsDrilldown(
          session.lenderId,
          drilldownType,
          selectedRange,
        )

        if (isMounted) {
          setDrilldown(data)
        }
      } catch (loadError) {
        if (isMounted) {
          setDrilldownError(
            loadError instanceof Error
              ? loadError.message
              : 'Failed to load drilldown data.',
          )
        }
      } finally {
        if (isMounted) {
          setIsDrilldownLoading(false)
        }
      }
    }

    void loadDrilldown()

    return () => {
      isMounted = false
    }
  }, [drilldownType, selectedRange, session.lenderId])

  useEffect(() => {
    if (!drilldownType) {
      return
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        handleCloseDrilldown()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [drilldownType])

  const summaryCards = useMemo(() => {
    if (!summaryData) {
      return []
    }

    return [
      {
        label: 'Total Lent',
        value: formatCurrency(summaryData.summary.totalLent),
        caption: 'Lending volume in selected period',
        tone: 'primary',
        drilldownType: 'total-lent',
      },
      {
        label: 'Total Collected',
        value: formatCurrency(summaryData.summary.totalCollected),
        caption: 'Repayments captured in selected period',
        tone: 'success',
        drilldownType: 'total-collected',
      },
      {
        label: 'Active Loans',
        value: String(summaryData.summary.activeLoans),
        caption: 'Loans currently in active status',
        tone: 'warning',
        drilldownType: 'active-loans',
      },
      {
        label: 'Repayment Success',
        value: formatPercent(summaryData.summary.repaymentSuccessRate),
        caption: 'Completed vs defaulted closed loans',
        tone: 'danger',
        drilldownType: null,
      },
    ]
  }, [summaryData])

  function handleOpenDrilldown(type: string) {
    setDrilldownType(type)
    setDrilldown(null)
    setDrilldownError(null)
  }

  function handleCloseDrilldown() {
    setDrilldownType(null)
    setDrilldown(null)
    setDrilldownError(null)
  }

  return (
    <>
      <section className="dashboard-panel">
        <header className="page-header">
          <div>
            <p className="eyebrow">Lender analytics</p>
            <h1 className="page-title">Analytics</h1>
            <p className="page-subtitle">
              Track lending growth, repayment quality, request conversion, and
              portfolio risk from a lender business perspective.
            </p>
          </div>

          <div className="analytics-header-tools">
            <div className="analytics-lender-pill">
              {session.displayName} • {session.lenderId}
            </div>
            <div className="analytics-range-tabs" role="tablist" aria-label="Time range">
              {RANGE_OPTIONS.map((option) => (
                <button
                  key={option.key}
                  type="button"
                  className={`analytics-range-tab${
                    selectedRange === option.key ? ' analytics-range-tab--active' : ''
                  }`}
                  onClick={() => setSelectedRange(option.key)}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>
        </header>

        {isLoading ? (
          <section className="card loading-card">
            <p>Loading analytics...</p>
          </section>
        ) : error ? (
          <section className="card error-card">
            <h2>Analytics data is not available yet</h2>
            <p>{error}</p>
            <p>
              Check the analytics API, the lender ID, and whether lender-linked
              data exists in Firebase.
            </p>
          </section>
        ) : summaryData ? (
          <>
            <section className="summary-grid" aria-label="Analytics summary">
              {summaryCards.map((card) => {
                const isClickable = Boolean(card.drilldownType)

                return (
                  <button
                    key={card.label}
                    type="button"
                    className={`card metric-card analytics-drilldown-card${
                      isClickable ? ' analytics-drilldown-card--interactive' : ''
                    }`}
                    onClick={() =>
                      card.drilldownType
                        ? handleOpenDrilldown(card.drilldownType)
                        : undefined
                    }
                    disabled={!card.drilldownType}
                  >
                    <div
                      className={`metric-icon metric-icon--${card.tone}`}
                      aria-hidden="true"
                    >
                      {card.label.slice(0, 2).toUpperCase()}
                    </div>
                    <div className="metric-copy">
                      <p className="metric-label">{card.label}</p>
                      <p className="metric-value">{card.value}</p>
                      <p className="metric-caption">{card.caption}</p>
                    </div>
                    {isClickable ? (
                      <span className="analytics-drilldown-card__hint">View</span>
                    ) : null}
                  </button>
                )
              })}
            </section>

            <section className="analytics-grid analytics-grid--primary">
              <article className="card analytics-card analytics-card--wide">
                <div className="analytics-card__header">
                  <div>
                    <h2 className="section-title">Lending Trend</h2>
                    <p className="section-subtitle">
                      How much capital moved into new loans across the selected
                      period.
                    </p>
                  </div>
                </div>
                {overview ? (
                  <TrendBars
                    data={overview.trends.lendingByMonth}
                    colorClassName="analytics-bars__fill--primary"
                  />
                ) : (
                  <p className="analytics-empty-copy">
                    {isOverviewLoading ? 'Loading lending trend...' : 'Trend data is not available yet.'}
                  </p>
                )}
              </article>

              <article className="card analytics-card">
                <div className="analytics-card__header">
                  <div>
                    <h2 className="section-title">Loan Status Mix</h2>
                    <p className="section-subtitle">
                      Current distribution of lender-owned loans by status.
                    </p>
                  </div>
                </div>
                {overview ? (
                  <StatusBreakdown data={overview.breakdowns.loanStatus} />
                ) : (
                  <p className="analytics-empty-copy">
                    {isOverviewLoading ? 'Loading loan status mix...' : 'Loan status data is not available yet.'}
                  </p>
                )}
              </article>
            </section>

            <section className="analytics-grid analytics-grid--secondary">
              <article className="card analytics-card">
                <div className="analytics-card__header">
                  <div>
                    <h2 className="section-title">Collection Trend</h2>
                    <p className="section-subtitle">
                      Repayments recorded from your loan portfolio.
                    </p>
                  </div>
                </div>
                {overview ? (
                  <TrendBars
                    data={overview.trends.collectionByMonth}
                    colorClassName="analytics-bars__fill--success"
                  />
                ) : (
                  <p className="analytics-empty-copy">
                    {isOverviewLoading ? 'Loading collection trend...' : 'Collection trend data is not available yet.'}
                  </p>
                )}
              </article>

              <article className="card analytics-card">
                <div className="analytics-card__header">
                  <div>
                    <h2 className="section-title">Business Health</h2>
                    <p className="section-subtitle">
                      Core lending economics that influence portfolio growth.
                    </p>
                  </div>
                </div>
                <div className="analytics-mini-grid">
                  <article className="analytics-mini-card">
                    <p className="analytics-mini-card__label">Outstanding Amount</p>
                    <p className="analytics-mini-card__value">
                      {formatCurrency(summaryData.portfolio.outstandingAmount)}
                    </p>
                  </article>
                  <article className="analytics-mini-card">
                    <p className="analytics-mini-card__label">Average Loan Size</p>
                    <p className="analytics-mini-card__value">
                      {formatCurrency(summaryData.portfolio.averageLoanSize)}
                    </p>
                  </article>
                  <article className="analytics-mini-card">
                    <p className="analytics-mini-card__label">Average Interest</p>
                    <p className="analytics-mini-card__value">
                      {summaryData.portfolio.averageInterestRate.toFixed(1)}%
                    </p>
                  </article>
                  <article className="analytics-mini-card">
                    <p className="analytics-mini-card__label">Average Tenure</p>
                    <p className="analytics-mini-card__value">
                      {summaryData.portfolio.averageTenureMonths.toFixed(1)} months
                    </p>
                  </article>
                </div>
              </article>
            </section>

            <section className="analytics-grid analytics-grid--secondary">
              <article className="card analytics-card">
                <div className="analytics-card__header">
                  <div>
                    <h2 className="section-title">Ad & Request Performance</h2>
                    <p className="section-subtitle">
                      See whether marketing activity is turning into real loan
                      opportunities.
                    </p>
                  </div>
                </div>
                <div className="analytics-mini-grid">
                  <button
                    type="button"
                    className="analytics-mini-card analytics-mini-card--interactive"
                    onClick={() => onNavigate('active-ads-requests')}
                  >
                    <p className="analytics-mini-card__label">Active Ads</p>
                    <p className="analytics-mini-card__value">
                      {summaryData.performance.activeAds}
                    </p>
                  </button>
                  <button
                    type="button"
                    className="analytics-mini-card analytics-mini-card--interactive"
                    onClick={() => handleOpenDrilldown('requests-received')}
                  >
                    <p className="analytics-mini-card__label">Requests Received</p>
                    <p className="analytics-mini-card__value">
                      {summaryData.performance.requestsReceived}
                    </p>
                  </button>
                  <button
                    type="button"
                    className="analytics-mini-card analytics-mini-card--interactive"
                    onClick={() => handleOpenDrilldown('accepted-requests')}
                  >
                    <p className="analytics-mini-card__label">Accepted Requests</p>
                    <p className="analytics-mini-card__value">
                      {summaryData.performance.acceptedRequests}
                    </p>
                  </button>
                  <article className="analytics-mini-card">
                    <p className="analytics-mini-card__label">Conversion Rate</p>
                    <p className="analytics-mini-card__value">
                      {formatPercent(summaryData.performance.requestToLoanConversionRate)}
                    </p>
                  </article>
                </div>
              </article>

              <article className="card analytics-card">
                <div className="analytics-card__header">
                  <div>
                    <h2 className="section-title">Risk Watch</h2>
                    <p className="section-subtitle">
                      Keep an eye on repayment stress and borrower quality.
                    </p>
                  </div>
                </div>
                <div className="analytics-mini-grid">
                  <button
                    type="button"
                    className="analytics-mini-card analytics-mini-card--interactive"
                    onClick={() => handleOpenDrilldown('overdue-loans')}
                  >
                    <p className="analytics-mini-card__label">Overdue Loans</p>
                    <p className="analytics-mini-card__value">
                      {summaryData.risk.overdueLoans}
                    </p>
                  </button>
                  <button
                    type="button"
                    className="analytics-mini-card analytics-mini-card--interactive"
                    onClick={() => handleOpenDrilldown('defaulted-loans')}
                  >
                    <p className="analytics-mini-card__label">Defaulted Loans</p>
                    <p className="analytics-mini-card__value">
                      {summaryData.risk.defaultedLoans}
                    </p>
                  </button>
                  <button
                    type="button"
                    className="analytics-mini-card analytics-mini-card--interactive"
                    onClick={() => handleOpenDrilldown('open-disputes')}
                  >
                    <p className="analytics-mini-card__label">Open Disputes</p>
                    <p className="analytics-mini-card__value">
                      {summaryData.risk.openDisputes}
                    </p>
                  </button>
                  <article className="analytics-mini-card">
                    <p className="analytics-mini-card__label">
                      Avg Borrower Credit Score
                    </p>
                    <p className="analytics-mini-card__value">
                      {summaryData.risk.averageBorrowerCreditScore !== null
                        ? summaryData.risk.averageBorrowerCreditScore.toFixed(0)
                        : 'N/A'}
                    </p>
                  </article>
                </div>
              </article>
            </section>

            <section className="card analytics-card">
              <div className="analytics-card__header">
                <div>
                  <h2 className="section-title">Business Insights</h2>
                  <p className="section-subtitle">
                    Quick plain-English takeaways for lender growth and portfolio
                    quality.
                  </p>
                </div>
              </div>
              <div className="analytics-insights">
                {overview?.insights.length ? (
                  overview.insights.map((insight) => (
                    <article className="analytics-insight" key={insight}>
                      <span className="analytics-insight__dot" aria-hidden="true" />
                      <p>{insight}</p>
                    </article>
                  ))
                ) : isOverviewLoading ? (
                  <p className="analytics-empty-copy">Loading insights...</p>
                ) : (
                  <p className="analytics-empty-copy">
                    Insights will appear when enough lender data is available.
                  </p>
                )}
              </div>
            </section>
          </>
        ) : null}
      </section>

      {drilldownType ? (
        <div
          className="borrower-modal__backdrop"
          role="presentation"
          onClick={handleCloseDrilldown}
        >
          <section
            className="borrower-modal analytics-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="analytics-drilldown-title"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="borrower-modal__header">
              <div>
                <p className="eyebrow">Analytics drilldown</p>
                <h2 className="section-title" id="analytics-drilldown-title">
                  {drilldown?.title ?? 'Loading details...'}
                </h2>
                <p className="section-subtitle">
                  {drilldown?.description ??
                    'Review the underlying lender records behind this metric.'}
                </p>
              </div>
              <button
                type="button"
                className="borrower-modal__close"
                aria-label="Close analytics drilldown"
                onClick={handleCloseDrilldown}
              >
                X
              </button>
            </div>

            <div className="borrower-modal__body">
              {isDrilldownLoading ? (
                <div className="borrower-modal__state">
                  Loading drilldown details...
                </div>
              ) : drilldownError ? (
                <div className="borrower-modal__state borrower-modal__state--error">
                  {drilldownError}
                </div>
              ) : drilldown ? (
                drilldown.items.length > 0 ? (
                  <div className="analytics-drilldown-list">
                    {drilldown.items.map((item) => (
                      <article className="analytics-drilldown-item" key={item.id}>
                        <div className="analytics-drilldown-item__main">
                          <h3 className="analytics-drilldown-item__title">
                            {item.title}
                          </h3>
                          <p className="analytics-drilldown-item__subtitle">
                            {item.subtitle}
                          </p>
                        </div>
                        <div className="analytics-drilldown-item__meta">
                          <span className="badge badge-gray">
                            {formatLabel(item.status)}
                          </span>
                          <p className="analytics-drilldown-item__metric">
                            {item.metric}
                          </p>
                          {item.secondaryMetric ? (
                            <p className="analytics-drilldown-item__secondary">
                              {item.secondaryMetric}
                            </p>
                          ) : null}
                          <p className="analytics-drilldown-item__date">
                            {formatShortDate(item.date)}
                          </p>
                        </div>
                      </article>
                    ))}
                  </div>
                ) : (
                  <div className="borrower-modal__state">
                    No records were found for this metric in the selected range.
                  </div>
                )
              ) : null}
            </div>
          </section>
        </div>
      ) : null}
    </>
  )
}
