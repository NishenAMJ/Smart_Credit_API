import { useEffect, useState } from "react";
import {
  BadgeCheck,
  Ban,
  CalendarDays,
  Eye,
  Percent,
  Plus,
  Timer,
  X,
} from "lucide-react";
import BorrowerSidePanel from "../components/borrowers/BorrowerSidePanel";
import type { LenderView } from "../components/common/LenderSidebar";
import CreateAdPage from "./create-ad";
import {
  fetchLenderAdsPage,
  type LenderAd,
  type LenderAdsListResponse,
} from "../lib/lender-ads-api";
import {
  decideLoanRequest,
  fetchPendingRequests,
  type LoanRequestDecision,
  type PendingRequest,
  type PendingRequestsResponse,
} from "../lib/pending-requests-api";
import type { LenderSession } from "../lib/lender-session";

type ActiveAdsRequestsPageProps = {
  session: LenderSession;
  onNavigate: (view: LenderView) => void;
  onOpenAgreement: (loanId: string) => void;
};

type AdStatusGroup = "active" | "pending_review" | "inactive";

const AD_PAGE_SIZE = 12;
const REQUEST_LIMIT = 30;
const ACTIONABLE_REQUEST_STATUSES = new Set([
  "open",
  "pending",
  "submitted",
  "under_review",
  "matched",
  "approved",
  "pending_kyc",
]);
const TERMINAL_REQUEST_STATUSES = new Set([
  "converted",
  "rejected",
  "withdrawn",
  "cancelled",
  "funded",
]);

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
  if (!value) return "Date unavailable";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "Date unavailable";
  return new Intl.DateTimeFormat("en-LK", {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(parsed);
}

function mergeAdPage(
  current: LenderAdsListResponse | null,
  next: LenderAdsListResponse,
): LenderAdsListResponse {
  if (!current) return next;
  return {
    ...next,
    ads: [
      ...current.ads,
      ...next.ads.filter(
        (nextAd) => !current.ads.some((ad) => ad.id === nextAd.id),
      ),
    ],
  };
}

function AdvertisementCard({
  ad,
  canReviewRequests,
  onPreview,
  onReviewRequests,
}: {
  ad: LenderAd;
  canReviewRequests: boolean;
  onPreview: () => void;
  onReviewRequests: () => void;
}) {
  return (
    <article className="lender-ad-card">
      <header className="lender-ad-card__header">
        <span
          className={`lender-ad-status lender-ad-status--${ad.status.replaceAll("_", "-")}`}
        >
          {formatLabel(ad.status)}
        </span>
        <span className="lender-ad-card__date">
          <CalendarDays size={14} /> {formatDate(ad.createdAt)}
        </span>
      </header>

      <div className="lender-ad-card__content">
        <p className="lender-ad-card__audience">{ad.borrowerFocus}</p>
        <h3>{ad.title}</h3>
        <p className="lender-ad-card__description">
          {ad.description || "No description was provided."}
        </p>
      </div>

      <dl className="lender-ad-card__terms">
        <div>
          <dt>Amount range</dt>
          <dd>
            {formatCurrency(ad.minAmount)} – {formatCurrency(ad.maxAmount)}
          </dd>
        </div>
        <div>
          <dt>
            <Percent size={14} /> Annual rate
          </dt>
          <dd>{ad.preferredInterestRate}%</dd>
        </div>
        <div>
          <dt>
            <Timer size={14} /> Maximum term
          </dt>
          <dd>{ad.maxTenureMonths} months</dd>
        </div>
      </dl>

      <footer className="lender-ad-card__actions">
        <button
          type="button"
          className="button button-secondary"
          onClick={onPreview}
        >
          <Eye size={16} /> Preview
        </button>
        {canReviewRequests ? (
          <button
            type="button"
            className="button button-primary"
            onClick={onReviewRequests}
          >
            View borrower requests
          </button>
        ) : (
          <p>
            {ad.status === "pending_review"
              ? "Waiting for admin approval"
              : "Not currently visible to borrowers"}
          </p>
        )}
      </footer>
    </article>
  );
}

function AdvertisementSection({
  title,
  description,
  response,
  isLoading,
  isLoadingMore,
  emptyMessage,
  canReviewRequests,
  onPreview,
  onReviewRequests,
  onLoadMore,
}: {
  title: string;
  description: string;
  response: LenderAdsListResponse | null;
  isLoading: boolean;
  isLoadingMore: boolean;
  emptyMessage: string;
  canReviewRequests: boolean;
  onPreview: (ad: LenderAd) => void;
  onReviewRequests: (ad: LenderAd) => void;
  onLoadMore: () => void;
}) {
  return (
    <section className="card lender-ad-section">
      <div className="lender-ad-section__header">
        <div>
          <h2 className="section-title">{title}</h2>
          <p className="section-subtitle">{description}</p>
        </div>
        {!isLoading ? (
          <span className="lender-ad-section__count">
            {response?.ads.length ?? 0}
          </span>
        ) : null}
      </div>

      {isLoading ? (
        <div className="borrower-modal__state">Loading advertisements...</div>
      ) : response?.ads.length ? (
        <div className="lender-ad-grid">
          {response.ads.map((ad) => (
            <AdvertisementCard
              key={ad.id}
              ad={ad}
              canReviewRequests={canReviewRequests}
              onPreview={() => onPreview(ad)}
              onReviewRequests={() => onReviewRequests(ad)}
            />
          ))}
        </div>
      ) : (
        <div className="lender-ad-empty">{emptyMessage}</div>
      )}

      {response?.pageInfo.hasMore ? (
        <div className="active-ads-load-more">
          <button
            type="button"
            className="button button-secondary"
            onClick={onLoadMore}
            disabled={isLoadingMore}
          >
            {isLoadingMore ? "Loading..." : "Load more"}
          </button>
        </div>
      ) : null}
    </section>
  );
}

function AdvertisementPreview({
  ad,
  session,
  onClose,
}: {
  ad: LenderAd;
  session: LenderSession;
  onClose: () => void;
}) {
  return (
    <div
      className="create-ad-preview-backdrop"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <section
        className="card create-ad-preview-card create-ad-preview-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="saved-ad-preview-title"
      >
        <div className="create-ad-preview-card__top">
          <div>
            <p className="create-ad-section-kicker">Borrower view</p>
            <h2 className="section-title" id="saved-ad-preview-title">
              Advertisement preview
            </h2>
          </div>
          <div className="create-ad-preview-card__actions">
            <span className="create-ad-draft-badge">
              {formatLabel(ad.status)}
            </span>
            <button
              type="button"
              className="create-ad-preview-close"
              onClick={onClose}
              aria-label="Close advertisement preview"
            >
              <X size={17} />
            </button>
          </div>
        </div>

        <div className="create-ad-preview">
          <div className="create-ad-preview__brand">
            <div className="create-ad-preview__logo" aria-hidden="true">
              {session.displayName.slice(0, 1).toUpperCase()}
            </div>
            <div className="create-ad-preview__identity">
              <p className="create-ad-preview__name">
                {ad.lenderName || session.displayName}
              </p>
              <p className="create-ad-preview__meta">
                <BadgeCheck size={14} /> Verified lender
              </p>
            </div>
          </div>
          <div>
            <p className="create-ad-preview__audience">{ad.borrowerFocus}</p>
            <h3 className="create-ad-preview__title">{ad.title}</h3>
          </div>
          <article className="create-ad-preview__amount">
            <span>Available amount</span>
            <strong>
              {formatCurrency(ad.minAmount)} – {formatCurrency(ad.maxAmount)}
            </strong>
          </article>
          <div className="create-ad-preview__metrics">
            <article className="create-ad-preview__metric">
              <span>Annual rate</span>
              <strong>{ad.preferredInterestRate}%</strong>
            </article>
            <article className="create-ad-preview__metric">
              <span>Maximum term</span>
              <strong>{ad.maxTenureMonths} months</strong>
            </article>
            <article className="create-ad-preview__metric">
              <span>Review time</span>
              <strong>{ad.processingTime.replace("Within ", "")}</strong>
            </article>
          </div>
          <p className="create-ad-preview__description">{ad.description}</p>
          <div className="create-ad-preview__requirements">
            <BadgeCheck size={16} aria-hidden="true" />
            <div>
              <strong>What borrowers need</strong>
              <p>{ad.requirements}</p>
            </div>
          </div>
          <div className="create-ad-preview__footer">
            <span>{ad.repaymentStyle}</span>
            <button type="button" disabled>
              View offer
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}

export default function ActiveAdsRequestsPage({
  session,
  onOpenAgreement,
}: ActiveAdsRequestsPageProps) {
  const [activeResponse, setActiveResponse] =
    useState<LenderAdsListResponse | null>(null);
  const [pendingResponse, setPendingResponse] =
    useState<LenderAdsListResponse | null>(null);
  const [inactiveResponse, setInactiveResponse] =
    useState<LenderAdsListResponse | null>(null);
  const [isAdsLoading, setIsAdsLoading] = useState(true);
  const [loadingMoreGroup, setLoadingMoreGroup] =
    useState<AdStatusGroup | null>(null);
  const [adsError, setAdsError] = useState<string | null>(null);
  const [previewAd, setPreviewAd] = useState<LenderAd | null>(null);
  const [selectedAd, setSelectedAd] = useState<LenderAd | null>(null);
  const [requestsResponse, setRequestsResponse] =
    useState<PendingRequestsResponse | null>(null);
  const [isRequestsLoading, setIsRequestsLoading] = useState(false);
  const [requestsError, setRequestsError] = useState<string | null>(null);
  const [decisionError, setDecisionError] = useState<string | null>(null);
  const [decisionRequestId, setDecisionRequestId] = useState<string | null>(
    null,
  );
  const [isCreateAdOpen, setIsCreateAdOpen] = useState(false);
  const [adsRefreshKey, setAdsRefreshKey] = useState(0);
  const [adsNotice, setAdsNotice] = useState<string | null>(null);
  const [selectedBorrowerId, setSelectedBorrowerId] = useState<string | null>(
    null,
  );

  const requests = requestsResponse?.requests ?? [];

  useEffect(() => {
    let isMounted = true;
    const loadAds = async () => {
      try {
        setIsAdsLoading(true);
        setAdsError(null);
        const [active, pending, inactive] = await Promise.all([
          fetchLenderAdsPage({ pageSize: AD_PAGE_SIZE, status: "active" }),
          fetchLenderAdsPage({
            pageSize: AD_PAGE_SIZE,
            status: "pending_review",
          }),
          fetchLenderAdsPage({ pageSize: AD_PAGE_SIZE, status: "inactive" }),
        ]);
        if (!isMounted) return;
        setActiveResponse(active);
        setPendingResponse(pending);
        setInactiveResponse(inactive);
      } catch (loadError) {
        if (isMounted) {
          setAdsError(
            loadError instanceof Error
              ? loadError.message
              : "Failed to load advertisements.",
          );
        }
      } finally {
        if (isMounted) setIsAdsLoading(false);
      }
    };
    void loadAds();
    return () => {
      isMounted = false;
    };
  }, [session.lenderId, adsRefreshKey]);

  useEffect(() => {
    if (!isCreateAdOpen && !selectedAd && !previewAd) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      if (previewAd) setPreviewAd(null);
      else if (isCreateAdOpen) setIsCreateAdOpen(false);
      else setSelectedAd(null);
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isCreateAdOpen, previewAd, selectedAd]);

  useEffect(() => {
    if (!adsNotice) return;
    const timer = window.setTimeout(() => setAdsNotice(null), 5000);
    return () => window.clearTimeout(timer);
  }, [adsNotice]);

  useEffect(() => {
    if (!selectedAd) return;
    let isMounted = true;
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
        if (isMounted) setRequestsResponse(data);
      } catch (loadError) {
        if (isMounted) {
          setRequestsError(
            loadError instanceof Error
              ? loadError.message
              : "Failed to load borrower requests for this advertisement.",
          );
        }
      } finally {
        if (isMounted) setIsRequestsLoading(false);
      }
    };
    void loadRequests();
    return () => {
      isMounted = false;
    };
  }, [selectedAd]);

  const handleLoadMore = async (group: AdStatusGroup) => {
    const current =
      group === "active"
        ? activeResponse
        : group === "pending_review"
          ? pendingResponse
          : inactiveResponse;
    const cursor = current?.pageInfo.nextCursor;
    if (!cursor || loadingMoreGroup) return;
    try {
      setLoadingMoreGroup(group);
      setAdsError(null);
      const next = await fetchLenderAdsPage({
        pageSize: AD_PAGE_SIZE,
        status: group,
        cursor,
      });
      if (group === "active") {
        setActiveResponse((value) => mergeAdPage(value, next));
      } else if (group === "pending_review") {
        setPendingResponse((value) => mergeAdPage(value, next));
      } else {
        setInactiveResponse((value) => mergeAdPage(value, next));
      }
    } catch (loadError) {
      setAdsError(
        loadError instanceof Error
          ? loadError.message
          : "Failed to load more advertisements.",
      );
    } finally {
      setLoadingMoreGroup(null);
    }
  };

  const handleDecision = async (
    request: PendingRequest,
    decision: LoanRequestDecision,
  ) => {
    try {
      setDecisionRequestId(request.requestId);
      setDecisionError(null);
      const result = await decideLoanRequest(
        request.requestId,
        decision,
        decision === "approve"
          ? "Approved from the advertisement request review."
          : "Rejected from the advertisement request review.",
      );
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
      );
      if (decision === "approve" && result.loanId) {
        onOpenAgreement(result.loanId);
      }
    } catch (decisionFailure) {
      setDecisionError(
        decisionFailure instanceof Error
          ? decisionFailure.message
          : "Failed to update this borrower request.",
      );
    } finally {
      setDecisionRequestId(null);
    }
  };

  return (
    <section className="dashboard-panel lender-advertisements-page">
      <header className="page-header">
        <div>
          <h1 className="page-title">Advertisements</h1>
          <p className="page-subtitle">
            Review published offers and advertisements waiting for approval.
          </p>
        </div>
        <button
          type="button"
          className="create-ad-button create-ad-button--primary"
          onClick={() => setIsCreateAdOpen(true)}
        >
          <Plus size={16} /> Create advertisement
        </button>
      </header>

      {adsError ? (
        <div className="sms-alert sms-alert--error" role="alert">
          {adsError}
        </div>
      ) : null}
      {adsNotice ? (
        <div
          className="create-ad-banner create-ad-banner--primary"
          role="status"
        >
          {adsNotice}
        </div>
      ) : null}

      <AdvertisementSection
        title="Active advertisements"
        description="Approved offers currently visible to borrowers."
        response={activeResponse}
        isLoading={isAdsLoading}
        isLoadingMore={loadingMoreGroup === "active"}
        emptyMessage="No active advertisements are available."
        canReviewRequests
        onPreview={setPreviewAd}
        onReviewRequests={setSelectedAd}
        onLoadMore={() => void handleLoadMore("active")}
      />
      <AdvertisementSection
        title="Pending approval"
        description="Submitted advertisements waiting for an administrator decision."
        response={pendingResponse}
        isLoading={isAdsLoading}
        isLoadingMore={loadingMoreGroup === "pending_review"}
        emptyMessage="No advertisements are waiting for approval."
        canReviewRequests={false}
        onPreview={setPreviewAd}
        onReviewRequests={() => undefined}
        onLoadMore={() => void handleLoadMore("pending_review")}
      />
      <AdvertisementSection
        title="Paused and previous advertisements"
        description="Offers that are paused, rejected, expired, closed, or still saved as drafts."
        response={inactiveResponse}
        isLoading={isAdsLoading}
        isLoadingMore={loadingMoreGroup === "inactive"}
        emptyMessage="No paused or previous advertisements are available."
        canReviewRequests={false}
        onPreview={setPreviewAd}
        onReviewRequests={() => undefined}
        onLoadMore={() => void handleLoadMore("inactive")}
      />

      {previewAd ? (
        <AdvertisementPreview
          ad={previewAd}
          session={session}
          onClose={() => setPreviewAd(null)}
        />
      ) : null}

      {selectedAd ? (
        <div
          className="borrower-modal__backdrop"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              setSelectedAd(null);
              setDecisionError(null);
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
                  Review requests submitted through this advertisement.
                </p>
              </div>
              <button
                type="button"
                className="borrower-modal__close"
                aria-label="Close borrower requests"
                onClick={() => {
                  setSelectedAd(null);
                  setDecisionError(null);
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
              ) : requests.length ? (
                <div className="active-ads-request-list">
                  {requests.map((request) => {
                    const isActionable = ACTIONABLE_REQUEST_STATUSES.has(
                      request.status,
                    );
                    const isTerminal = TERMINAL_REQUEST_STATUSES.has(
                      request.status,
                    );
                    const isUpdating = decisionRequestId === request.requestId;
                    return (
                      <article
                        className="active-ads-request-card"
                        key={request.requestId}
                      >
                        <div className="analytics-drilldown-item">
                          <div className="analytics-drilldown-item__main">
                            <button
                              type="button"
                              className="analytics-drilldown-item__title borrower-name--button"
                              onClick={() => {
                                setSelectedAd(null);
                                setSelectedBorrowerId(request.borrowerId);
                              }}
                            >
                              {request.borrowerName}
                            </button>
                            <p className="analytics-drilldown-item__subtitle">
                              {request.purpose}
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
                            Credit score{" "}
                            {request.borrowerCreditScore ?? "unavailable"}
                          </span>
                          <span>
                            KYC {formatLabel(request.borrowerKycStatus)}
                          </span>
                        </div>
                        <div className="request-decision-actions">
                          {isActionable ? (
                            <>
                              <button
                                type="button"
                                className="button button-secondary request-decision-button--reject"
                                disabled={decisionRequestId !== null}
                                onClick={() =>
                                  void handleDecision(request, "reject")
                                }
                              >
                                <Ban size={16} /> Reject
                              </button>
                              <button
                                type="button"
                                className="button button-primary"
                                disabled={decisionRequestId !== null}
                                onClick={() =>
                                  void handleDecision(request, "approve")
                                }
                              >
                                <BadgeCheck size={16} />
                                {isUpdating ? "Saving..." : "Approve"}
                              </button>
                            </>
                          ) : (
                            <p className="request-decision-complete">
                              {isTerminal
                                ? "This request already has a final decision."
                                : "This request is not ready for a lender decision."}
                            </p>
                          )}
                        </div>
                      </article>
                    );
                  })}
                </div>
              ) : (
                <div className="borrower-modal__state">
                  No borrower requests have reached this advertisement yet.
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
            if (event.target === event.currentTarget) setIsCreateAdOpen(false);
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
                <h2 className="section-title" id="create-ad-modal-title">
                  Create advertisement
                </h2>
                <p className="section-subtitle">
                  Complete the form and submit it for review.
                </p>
              </div>
              <button
                type="button"
                className="borrower-modal__close"
                aria-label="Close create advertisement form"
                onClick={() => setIsCreateAdOpen(false)}
              >
                <X size={20} />
              </button>
            </header>
            <div className="borrower-modal__body">
              <CreateAdPage
                session={session}
                embedded
                onPublished={() => {
                  setIsCreateAdOpen(false);
                  setAdsNotice(
                    "Advertisement submitted successfully and sent for admin review.",
                  );
                  setAdsRefreshKey((value) => value + 1);
                }}
              />
            </div>
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
    </section>
  );
}
