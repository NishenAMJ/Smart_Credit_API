import { useEffect, useState } from 'react'
import { BadgeCheck, Ban, Files, Megaphone, Plus, X } from 'lucide-react'
import type { LenderView } from '../components/common/LenderSidebar'
import CreateAdPage from './create-ad'
import {
  fetchAnalyticsDrilldown,
  type AnalyticsDrilldownItem,
  type AnalyticsDrilldownResponse,
} from '../lib/analytics-api'
import {
  decideLoanRequest,
  fetchPendingRequests,
  type LoanRequestDecision,
  type PendingRequest,
  type PendingRequestsResponse,
} from '../lib/pending-requests-api'
import type { LenderSession } from '../lib/lender-session'

type ActiveAdsRequestsPageProps = {
  session: LenderSession
  onNavigate: (view: LenderView) => void
}

const ADS_PAGE_SIZE = 5
const REQUEST_LIMIT = 30
const ACTIONABLE_REQUEST_STATUSES = new Set([
  'open',
  'submitted',
  'under_review',
  'matched',
  'pending_kyc',
])

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

function formatDate(value: string | null): string {
  if (!value) {
    return 'Unknown'
  }

  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) {
    return 'Unknown'
  }

  return new Intl.DateTimeFormat('en-LK', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  }).format(parsed)
}

export default function ActiveAdsRequestsPage({
  session,
}: ActiveAdsRequestsPageProps) {
  const [currentPage, setCurrentPage] = useState(1)
  const [pageCursors, setPageCursors] = useState<Array<string | null>>([null])
  const [adsResponse, setAdsResponse] = useState<AnalyticsDrilldownResponse | null>(null)
  const [isAdsLoading, setIsAdsLoading] = useState(true)
  const [adsError, setAdsError] = useState<string | null>(null)
  const [selectedAd, setSelectedAd] = useState<AnalyticsDrilldownItem | null>(null)
  const [requestsResponse, setRequestsResponse] =
    useState<PendingRequestsResponse | null>(null)
  const [isRequestsLoading, setIsRequestsLoading] = useState(false)
  const [requestsError, setRequestsError] = useState<string | null>(null)
  const [decisionError, setDecisionError] = useState<string | null>(null)
  const [decisionRequestId, setDecisionRequestId] = useState<string | null>(null)
  const [isCreateAdOpen, setIsCreateAdOpen] = useState(false)
  const [adsRefreshKey, setAdsRefreshKey] = useState(0)

  const activeCursor = pageCursors[currentPage - 1] ?? null
  const ads = adsResponse?.items ?? []
  const requests = requestsResponse?.requests ?? []

  useEffect(() => {
    setCurrentPage(1)
    setPageCursors([null])
    setAdsResponse(null)
    setSelectedAd(null)
    setRequestsResponse(null)
    setAdsError(null)
    setRequestsError(null)
  }, [session.lenderId])

  useEffect(() => {
    let isMounted = true

    const loadAds = async () => {
      try {
        setIsAdsLoading(true)
        setAdsError(null)
        setAdsResponse(null)
        setSelectedAd(null)
        setRequestsResponse(null)
        const data = await fetchAnalyticsDrilldown(
          session.lenderId,
          'active-ads',
          '90d',
          {
            pageSize: ADS_PAGE_SIZE,
            cursor: activeCursor,
          },
        )

        if (!isMounted) {
          return
        }

        setAdsResponse(data)

        if (data.pageInfo.nextCursor) {
          setPageCursors((current) => {
            if (current[currentPage] === data.pageInfo.nextCursor) {
              return current
            }

            return [...current.slice(0, currentPage), data.pageInfo.nextCursor]
          })
        }
      } catch (loadError) {
        if (isMounted) {
          setAdsError(
            loadError instanceof Error
              ? loadError.message
              : 'Failed to load active ads.',
          )
        }
      } finally {
        if (isMounted) {
          setIsAdsLoading(false)
        }
      }
    }

    void loadAds()

    return () => {
      isMounted = false
    }
  }, [activeCursor, currentPage, session.lenderId, adsRefreshKey])

  useEffect(() => {
    if (!isCreateAdOpen && !selectedAd) return

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return

      if (isCreateAdOpen) {
        setIsCreateAdOpen(false)
      } else {
        setSelectedAd(null)
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isCreateAdOpen, selectedAd])

  useEffect(() => {
    if (!selectedAd) {
      return
    }

    let isMounted = true

    const loadRequests = async () => {
      try {
        setIsRequestsLoading(true)
        setRequestsError(null)
        setRequestsResponse(null)
        const data = await fetchPendingRequests({
          limit: REQUEST_LIMIT,
          adId: selectedAd.id,
          includeSummary: false,
          includeAllStatuses: true,
        })

        if (isMounted) {
          setRequestsResponse(data)
        }
      } catch (loadError) {
        if (isMounted) {
          setRequestsError(
            loadError instanceof Error
              ? loadError.message
              : 'Failed to load borrower requests for this ad.',
          )
        }
      } finally {
        if (isMounted) {
          setIsRequestsLoading(false)
        }
      }
    }

    void loadRequests()

    return () => {
      isMounted = false
    }
  }, [selectedAd, session.lenderId])

  const handleDecision = async (
    request: PendingRequest,
    decision: LoanRequestDecision,
  ) => {
    try {
      setDecisionRequestId(request.requestId)
      setDecisionError(null)
      const result = await decideLoanRequest(
        request.requestId,
        decision,
        decision === 'approve'
          ? 'Approved from the advertisement request review.'
          : 'Rejected from the advertisement request review.',
      )

      setRequestsResponse((current) =>
        current
          ? {
              ...current,
              requests: current.requests.map((item) =>
                item.requestId === result.requestId
                  ? {
                      ...item,
                      status: result.status,
                      updatedAt: result.updatedAt,
                    }
                  : item,
              ),
            }
          : current,
      )
    } catch (decisionFailure) {
      setDecisionError(
        decisionFailure instanceof Error
          ? decisionFailure.message
          : 'Failed to update this borrower request.',
      )
    } finally {
      setDecisionRequestId(null)
    }
  }

  return (
    <section className="dashboard-panel">
      <header className="page-header">
        <div>
          <p className="eyebrow">Ad performance</p>
          <h1 className="page-title">Active Ads Requests</h1>
          <p className="page-subtitle">
            Open one active ad at a time and review the borrower requests coming
            through that specific ad.
          </p>
          <p className="dashboard-context-pill">
            Ads desk: {session.displayName} - {session.lenderId}
          </p>
        </div>

        <div className="analytics-header-tools">
          <button
            type="button"
            className="create-ad-button create-ad-button--primary"
            onClick={() => setIsCreateAdOpen(true)}
          >
            <Plus size={16} /> Create Ad
          </button>
        </div>
      </header>

      <section className="summary-grid" aria-label="Active ads summary">
        <article className="card metric-card">
          <div className="metric-icon metric-icon--primary" aria-hidden="true">
            <Megaphone size={22} strokeWidth={1.8} />
          </div>
          <div className="metric-copy">
            <p className="metric-label">Ads Per Page</p>
            <p className="metric-value">{ADS_PAGE_SIZE}</p>
            <p className="metric-caption">Loads smaller batches for faster review</p>
          </div>
        </article>
        <article className="card metric-card">
          <div className="metric-icon metric-icon--success" aria-hidden="true">
            <Files size={22} strokeWidth={1.8} />
          </div>
          <div className="metric-copy">
            <p className="metric-label">Current Page</p>
            <p className="metric-value">{currentPage}</p>
            <p className="metric-caption">Only the current ad batch is requested</p>
          </div>
        </article>
      </section>

      <section className="card analytics-card">
          <div className="analytics-card__header">
            <div>
              <h2 className="section-title">Active Ads</h2>
              <p className="section-subtitle">
                Click an ad to load only the borrower requests linked to it.
              </p>
            </div>
          </div>

          {adsError ? (
            <div className="borrower-modal__state borrower-modal__state--error">
              {adsError}
            </div>
          ) : isAdsLoading ? (
            <div className="borrower-modal__state">Loading active ads...</div>
          ) : ads.length > 0 ? (
            <div className="active-ads-list">
              {ads.map((ad) => {
                const isSelected = selectedAd?.id === ad.id

                return (
                  <button
                    key={ad.id}
                    type="button"
                    className={`active-ads-list__item${
                      isSelected ? ' active-ads-list__item--selected' : ''
                    }`}
                    onClick={() => setSelectedAd(ad)}
                  >
                    <div>
                      <p className="active-ads-list__title">{ad.title}</p>
                      <p className="active-ads-list__subtitle">{ad.subtitle}</p>
                    </div>
                    <div className="active-ads-list__meta">
                      <span className="badge badge-gray">{formatLabel(ad.status)}</span>
                      <p>{ad.metric}</p>
                    </div>
                  </button>
                )
              })}
            </div>
          ) : (
            <div className="borrower-modal__state">
              No active ads are available for this lender right now.
            </div>
          )}

          <div className="table-footer">
            <p>Showing up to {ADS_PAGE_SIZE} active ads on page {currentPage}.</p>

            <div className="pagination">
              <button
                type="button"
                className="pagination-button"
                onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
                disabled={currentPage === 1 || isAdsLoading}
              >
                Previous
              </button>

              <span className="pagination-status">Page {currentPage}</span>

              <button
                type="button"
                className="pagination-button"
                onClick={() => setCurrentPage((page) => page + 1)}
                disabled={!adsResponse?.pageInfo.hasMore || isAdsLoading}
              >
                Next
              </button>
            </div>
          </div>
      </section>

      {selectedAd ? (
        <div
          className="borrower-modal__backdrop"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              setSelectedAd(null)
              setDecisionError(null)
            }
          }}
        >
          <section
            className="borrower-modal pending-request-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="ad-requests-modal-title"
          >
            <header className="borrower-modal__header">
              <div>
                <p className="eyebrow">Borrower requests</p>
                <h2 className="section-title" id="ad-requests-modal-title">
                  {selectedAd.title}
                </h2>
                <p className="section-subtitle">
                  Review and decide requests submitted through this advertisement.
                </p>
              </div>
              <button
                type="button"
                className="borrower-modal__close"
                aria-label="Close borrower requests"
                onClick={() => {
                  setSelectedAd(null)
                  setDecisionError(null)
                }}
              >
                <X size={20} />
              </button>
            </header>

            <div className="borrower-modal__body">
              {decisionError ? (
                <div className="request-decision-error" role="alert">
                  {decisionError}
                </div>
              ) : null}

              {requestsError ? (
                <div className="borrower-modal__state borrower-modal__state--error">
                  {requestsError}
                </div>
              ) : isRequestsLoading ? (
                <div className="borrower-modal__state">
                  Loading borrower requests...
                </div>
              ) : requests.length > 0 ? (
                <div className="active-ads-request-list">
                  {requests.map((request) => {
                    const isActionable = ACTIONABLE_REQUEST_STATUSES.has(
                      request.status,
                    )
                    const isUpdating = decisionRequestId === request.requestId

                    return (
                      <article
                        className="active-ads-request-card"
                        key={request.requestId}
                      >
                        <div className="analytics-drilldown-item">
                          <div className="analytics-drilldown-item__main">
                            <h3 className="analytics-drilldown-item__title">
                              {request.borrowerName}
                            </h3>
                            <p className="analytics-drilldown-item__subtitle">
                              {request.purpose} · {request.borrowerEmail}
                            </p>
                          </div>
                          <div className="analytics-drilldown-item__meta">
                            <span className="badge badge-gray">
                              {formatLabel(request.status)}
                            </span>
                            <p className="analytics-drilldown-item__metric">
                              {formatCurrency(request.amount)}
                            </p>
                            <p className="analytics-drilldown-item__date">
                              {formatDate(request.createdAt)}
                            </p>
                          </div>
                        </div>

                        <div className="active-ads-request-card__details">
                          <span>{request.tenureMonths} month tenure</span>
                          <span>{formatLabel(request.urgency)} urgency</span>
                          <span>
                            Credit score {request.borrowerCreditScore ?? 'unavailable'}
                          </span>
                          <span>KYC {formatLabel(request.borrowerKycStatus)}</span>
                        </div>

                        <div className="request-decision-actions">
                          {isActionable ? (
                            <>
                              <button
                                type="button"
                                className="button button-secondary request-decision-button--reject"
                                disabled={decisionRequestId !== null}
                                onClick={() => void handleDecision(request, 'reject')}
                              >
                                <Ban size={16} /> Reject
                              </button>
                              <button
                                type="button"
                                className="button button-primary"
                                disabled={decisionRequestId !== null}
                                onClick={() => void handleDecision(request, 'approve')}
                              >
                                <BadgeCheck size={16} />
                                {isUpdating ? 'Saving...' : 'Approve'}
                              </button>
                            </>
                          ) : (
                            <p className="request-decision-complete">
                              This request already has a final decision.
                            </p>
                          )}
                        </div>
                      </article>
                    )
                  })}
                </div>
              ) : (
                <div className="borrower-modal__state">
                  No borrower requests have reached this ad yet.
                </div>
              )}
            </div>
          </section>
        </div>
      ) : null}

      {isCreateAdOpen ? (
        <div
          className="borrower-modal__backdrop"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setIsCreateAdOpen(false)
          }}
        >
          <section
            className="borrower-modal create-ad-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="create-ad-modal-title"
          >
            <header className="borrower-modal__header">
              <div>
                <h2 className="section-title" id="create-ad-modal-title">Create Ad</h2>
                <p className="section-subtitle">Publish a new lending offer.</p>
              </div>
              <button
                type="button"
                className="borrower-modal__close"
                aria-label="Close create ad form"
                onClick={() => setIsCreateAdOpen(false)}
              >
                <X size={20} />
              </button>
            </header>
            <div className="borrower-modal__body">
              <CreateAdPage
                session={session}
                embedded
                onPublished={() => setAdsRefreshKey((value) => value + 1)}
              />
            </div>
          </section>
        </div>
      ) : null}
    </section>
  )
}
