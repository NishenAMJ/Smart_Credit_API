// Cross-links active ads from analytics drilldowns with the requests attached to a selected ad.
import { useEffect, useState } from "react";
import type { LenderView } from "../config/lender-views";
import {
  fetchAnalyticsDrilldown,
  type AnalyticsDrilldownItem,
  type AnalyticsDrilldownResponse,
} from "../lib/analytics-api";
import {
  fetchPendingRequests,
  type PendingRequestsResponse,
} from "../lib/pending-requests-api";
import type { LenderSession } from "../lib/lender-session";

type ActiveAdsRequestsPageProps = {
  session: LenderSession;
  onNavigate: (view: LenderView) => void;
};

const ADS_PAGE_SIZE = 5;
const REQUEST_LIMIT = 30;

const currencyFormatter = new Intl.NumberFormat("en-LK", {
  style: "currency",
  currency: "LKR",
  maximumFractionDigits: 0,
});

function formatCurrency(value: number): string {
  return currencyFormatter.format(value);
}

function formatLabel(value: string): string {
  return value
    .replace(/_/g, " ")
    .replace(/\b\w/g, (character) => character.toUpperCase());
}

function formatDate(value: string | null): string {
  if (!value) {
    return "Unknown";
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return "Unknown";
  }

  return new Intl.DateTimeFormat("en-LK", {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(parsed);
}

export default function ActiveAdsRequestsPage({
  session,
  onNavigate,
}: ActiveAdsRequestsPageProps) {
  const [currentPage, setCurrentPage] = useState(1);
  const [pageCursors, setPageCursors] = useState<Array<string | null>>([null]);
  const [adsResponse, setAdsResponse] =
    useState<AnalyticsDrilldownResponse | null>(null);
  const [isAdsLoading, setIsAdsLoading] = useState(true);
  const [adsError, setAdsError] = useState<string | null>(null);
  const [selectedAd, setSelectedAd] = useState<AnalyticsDrilldownItem | null>(
    null,
  );
  const [requestsResponse, setRequestsResponse] =
    useState<PendingRequestsResponse | null>(null);
  const [isRequestsLoading, setIsRequestsLoading] = useState(false);
  const [requestsError, setRequestsError] = useState<string | null>(null);

  const activeCursor = pageCursors[currentPage - 1] ?? null;
  const ads = adsResponse?.items ?? [];
  const requests = requestsResponse?.requests ?? [];

  useEffect(() => {
    // Reset both panes when the lender changes so stale ad/request selections are cleared.
    setCurrentPage(1);
    setPageCursors([null]);
    setAdsResponse(null);
    setSelectedAd(null);
    setRequestsResponse(null);
    setAdsError(null);
    setRequestsError(null);
  }, [session.lenderId]);

  useEffect(() => {
    let isMounted = true;

    // Active ads are sourced from the analytics drilldown API so this page stays consistent with analytics.
    const loadAds = async () => {
      try {
        setIsAdsLoading(true);
        setAdsError(null);
        setAdsResponse(null);
        setSelectedAd(null);
        setRequestsResponse(null);
        const data = await fetchAnalyticsDrilldown("active-ads", "90d", {
          pageSize: ADS_PAGE_SIZE,
          cursor: activeCursor,
        });

        if (!isMounted) {
          return;
        }

        setAdsResponse(data);

        if (data.pageInfo.nextCursor) {
          setPageCursors((current) => {
            if (current[currentPage] === data.pageInfo.nextCursor) {
              return current;
            }

            return [...current.slice(0, currentPage), data.pageInfo.nextCursor];
          });
        }
      } catch (loadError) {
        if (isMounted) {
          setAdsError(
            loadError instanceof Error
              ? loadError.message
              : "Failed to load active ads.",
          );
        }
      } finally {
        if (isMounted) {
          setIsAdsLoading(false);
        }
      }
    };

    void loadAds();

    return () => {
      isMounted = false;
    };
  }, [activeCursor, currentPage, session.lenderId]);

  useEffect(() => {
    if (!selectedAd) {
      return;
    }

    let isMounted = true;

    // Request data is fetched only for the currently selected ad to avoid unnecessary marketplace queries.
    const loadRequests = async () => {
      try {
        setIsRequestsLoading(true);
        setRequestsError(null);
        setRequestsResponse(null);
        const data = await fetchPendingRequests({
          limit: REQUEST_LIMIT,
          adId: selectedAd.id,
          includeSummary: false,
          includeAllStatuses: true,
        });

        if (isMounted) {
          setRequestsResponse(data);
        }
      } catch (loadError) {
        if (isMounted) {
          setRequestsError(
            loadError instanceof Error
              ? loadError.message
              : "Failed to load borrower requests for this ad.",
          );
        }
      } finally {
        if (isMounted) {
          setIsRequestsLoading(false);
        }
      }
    };

    void loadRequests();

    return () => {
      isMounted = false;
    };
  }, [selectedAd, session.lenderId]);

  return (
    <section className="dashboard-panel">
      <header className="page-header">
        <div>
          <p className="eyebrow">Ads</p>
          <h1 className="page-title">Active Ads Requests</h1>
          <p className="page-subtitle">Active ads and linked requests.</p>
          <p className="dashboard-context-pill">{session.displayName}</p>
        </div>

        <div className="analytics-header-tools">
          <button
            type="button"
            className="analytics-range-tab"
            onClick={() => onNavigate("analytics")}
          >
            Back to Analytics
          </button>
        </div>
      </header>

      <section className="summary-grid" aria-label="Active ads summary">
        <article className="card metric-card">
          <div className="metric-icon metric-icon--primary" aria-hidden="true">
            AD
          </div>
          <div className="metric-copy">
            <p className="metric-label">Ads Per Page</p>
            <p className="metric-value">{ADS_PAGE_SIZE}</p>
            <p className="metric-caption">Ads shown per page</p>
          </div>
        </article>
        <article className="card metric-card">
          <div className="metric-icon metric-icon--success" aria-hidden="true">
            PG
          </div>
          <div className="metric-copy">
            <p className="metric-label">Current Page</p>
            <p className="metric-value">{currentPage}</p>
            <p className="metric-caption">Current result page</p>
          </div>
        </article>
      </section>

      <section className="analytics-grid analytics-grid--secondary">
        <article className="card analytics-card">
          <div className="analytics-card__header">
            <div>
              <h2 className="section-title">Active Ads</h2>
              <p className="section-subtitle">Select an ad to view requests.</p>
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
                const isSelected = selectedAd?.id === ad.id;

                return (
                  <button
                    key={ad.id}
                    type="button"
                    className={`active-ads-list__item${
                      isSelected ? " active-ads-list__item--selected" : ""
                    }`}
                    onClick={() => setSelectedAd(ad)}
                  >
                    <div>
                      <p className="active-ads-list__title">{ad.title}</p>
                      <p className="active-ads-list__subtitle">{ad.subtitle}</p>
                    </div>
                    <div className="active-ads-list__meta">
                      <span className="badge badge-gray">
                        {formatLabel(ad.status)}
                      </span>
                      <p>{ad.metric}</p>
                    </div>
                  </button>
                );
              })}
            </div>
          ) : (
            <div className="borrower-modal__state">
              No active ads found.
            </div>
          )}

          <div className="table-footer">
            <p>
              Showing up to {ADS_PAGE_SIZE} active ads on page {currentPage}.
            </p>

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
        </article>

        <article className="card analytics-card">
          <div className="analytics-card__header">
            <div>
              <h2 className="section-title">
                {selectedAd ? "Borrower Requests" : "Borrower Requests"}
              </h2>
              <p className="section-subtitle">
                {selectedAd
                  ? selectedAd.title
                  : "Select an ad to continue."}
              </p>
            </div>
          </div>

          {!selectedAd ? (
            <div className="borrower-modal__state">
              Select an ad to view requests.
            </div>
          ) : requestsError ? (
            <div className="borrower-modal__state borrower-modal__state--error">
              {requestsError}
            </div>
          ) : isRequestsLoading ? (
            <div className="borrower-modal__state">
              Loading borrower requests...
            </div>
          ) : requests.length > 0 ? (
            <div className="active-ads-request-list">
              {requests.map((request) => (
                <article
                  className="analytics-drilldown-item"
                  key={request.requestId}
                >
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
                    <p className="analytics-drilldown-item__secondary">
                      {request.tenureMonths} months ·{" "}
                      {formatLabel(request.urgency)}
                    </p>
                    <p className="analytics-drilldown-item__date">
                      {formatDate(request.createdAt)}
                    </p>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <div className="borrower-modal__state">
              No requests for this ad yet.
            </div>
          )}
        </article>
      </section>
    </section>
  );
}
