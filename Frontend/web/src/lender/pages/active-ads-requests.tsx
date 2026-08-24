import { useEffect, useState } from "react";
import {
  BadgeCheck,
  Ban,
  Check,
  CreditCard,
  Eye,
  Landmark,
  LoaderCircle,
  Plus,
  Rocket,
  X,
} from "lucide-react";
import BorrowerSidePanel from "../components/borrowers/BorrowerSidePanel";
import type { LenderView } from "../components/common/LenderSidebar";
import CreateAdPage from "./create-ad";
import {
  fetchLenderAdsPage,
  createAdBoost,
  fetchAdBoosts,
  fetchAdBoostPlans,
  submitBoostReceipt,
  uploadBoostReceipt,
  type AdBoost,
  type AdBoostPlan,
  type BoostReceiptUploadStage,
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
  onBoost,
}: {
  ad: LenderAd;
  canReviewRequests: boolean;
  onPreview: () => void;
  onReviewRequests: () => void;
  onBoost: () => void;
}) {
  return (
    <article className="lender-ad-card">
      <header className="lender-ad-card__header">
        <div className="lender-ad-card__identity">
          <p className="lender-ad-card__audience">{ad.borrowerFocus}</p>
          <h3>{ad.title}</h3>
        </div>
        <span
          className={`lender-ad-status lender-ad-status--${ad.status.replaceAll("_", "-")}`}
        >
          {formatLabel(ad.status)}
        </span>
      </header>

      <div className="lender-ad-card__amount">
        <span>Available amount</span>
        <strong>
          {formatCurrency(ad.minAmount)} – {formatCurrency(ad.maxAmount)}
        </strong>
      </div>

      <dl className="lender-ad-card__terms">
        <div>
          <dt>Applications</dt>
          <dd>{ad.applicationCount}</dd>
        </div>
        <div>
          <dt>Funded loans</dt>
          <dd>{ad.fundedLoansCount}</dd>
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
          <>
            <button
              type="button"
              className="button button-primary"
              onClick={onReviewRequests}
            >
              Requests
            </button>
            <button
              type="button"
              className="button button-secondary"
              onClick={onBoost}
              disabled={
                ad.isBoosted ||
                ad.boostStatus === "pending_verification"
              }
            >
              <Rocket size={16} />
              {ad.isBoosted
                ? "Boost active"
                : ad.boostStatus === "pending_verification"
                  ? "Awaiting verification"
                  : ad.boostStatus === "payment_pending"
                    ? "Continue boost"
                  : "Boost"}
            </button>
          </>
        ) : (
          <p className="lender-ad-card__next-state">
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
  onBoost,
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
  onBoost: (ad: LenderAd) => void;
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
              onBoost={() => onBoost(ad)}
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

function BoostAdDialog({
  ad,
  onClose,
  onComplete,
}: {
  ad: LenderAd;
  onClose: () => void;
  onComplete: (message: string) => void;
}) {
  const [plans, setPlans] = useState<AdBoostPlan[]>([]);
  const [bankAccount, setBankAccount] = useState<Record<string, string>>({});
  const [planId, setPlanId] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<"card" | "bank_transfer">(
    "card",
  );
  const [paymentMethods, setPaymentMethods] = useState({
    card: false,
    bankTransfer: false,
  });
  const [receipt, setReceipt] = useState<File | null>(null);
  const [bankReference, setBankReference] = useState("");
  const [busy, setBusy] = useState(false);
  const [isLoadingPlans, setIsLoadingPlans] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pendingBoostId, setPendingBoostId] = useState<string | null>(null);
  const [submissionStage, setSubmissionStage] = useState<
    "creating" | BoostReceiptUploadStage | "submitting" | null
  >(null);

  useEffect(() => {
    void Promise.all([fetchAdBoostPlans(), fetchAdBoosts()])
      .then(([result, existingBoosts]) => {
        const resumableBoost = existingBoosts.find(
          (boost) =>
            boost.listingId === ad.id &&
            boost.status === "payment_pending" &&
            boost.paymentMethod === "bank_transfer",
        );
        setPlans(result.plans);
        setPlanId(resumableBoost?.plan.id ?? result.plans[0]?.id ?? "");
        setBankAccount(result.bankAccount);
        setPaymentMethods(result.paymentMethods);
        if (resumableBoost) {
          setPendingBoostId(resumableBoost.boostId);
          setPaymentMethod("bank_transfer");
        } else if (result.paymentMethods.card) setPaymentMethod("card");
        else if (result.paymentMethods.bankTransfer)
          setPaymentMethod("bank_transfer");
        else
          setError(
            "Boost payments are not configured yet. Your advertisement remains active without a boost.",
          );
      })
      .catch((failure) =>
        setError(
          failure instanceof Error
            ? failure.message
            : "Failed to load boost plans.",
        ),
      )
      .finally(() => setIsLoadingPlans(false));
  }, [ad.id]);

  const selectedPlan = plans.find((plan) => plan.id === planId);

  async function submit() {
    if (!selectedPlan) return;
    if (
      paymentMethod === "bank_transfer" &&
      (!receipt || !bankReference.trim())
    ) {
      setError("Select a receipt and enter the bank reference.");
      return;
    }
    try {
      setBusy(true);
      setError(null);
      let boost: Pick<AdBoost, "boostId"> | AdBoost;
      if (pendingBoostId) {
        boost = { boostId: pendingBoostId };
      } else {
        setSubmissionStage("creating");
        boost = await createAdBoost({ listingId: ad.id, planId, paymentMethod });
      }
      if (paymentMethod === "card") {
        if (!("checkout" in boost) || !boost.checkout?.paymentPageUrl)
          throw new Error("Card checkout could not be started.");
        window.location.assign(boost.checkout.paymentPageUrl);
        return;
      }
      setPendingBoostId(boost.boostId);
      const uploaded = await uploadBoostReceipt(
        receipt!,
        boost.boostId,
        setSubmissionStage,
      );
      setSubmissionStage("submitting");
      await submitBoostReceipt(
        boost.boostId,
        uploaded.documentId,
        bankReference.trim(),
      );
      onComplete("Boost payment submitted for administrator verification.");
    } catch (failure) {
      setError(
        failure instanceof Error
          ? failure.message
          : "Failed to submit boost payment.",
      );
      setBusy(false);
      setSubmissionStage(null);
    }
  }

  const submissionLabel =
    submissionStage === "creating"
      ? "Creating request..."
      : submissionStage === "preparing"
        ? "Preparing upload..."
        : submissionStage === "uploading"
          ? "Uploading receipt..."
          : submissionStage === "registering"
            ? "Confirming receipt..."
            : submissionStage === "submitting"
              ? "Submitting for review..."
              : null;

  return (
    <div
      className="borrower-modal__backdrop"
      role="presentation"
      onMouseDown={(event) =>
        event.target === event.currentTarget && !busy && onClose()
      }
    >
      <section
        className="borrower-modal boost-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="boost-ad-title"
      >
        <header className="borrower-modal__header boost-dialog__header">
          <div className="boost-dialog__title-group">
            <span className="boost-dialog__title-icon" aria-hidden="true">
              <Rocket size={20} />
            </span>
            <div>
              <p className="eyebrow">Advertisement promotion</p>
              <h2 className="section-title" id="boost-ad-title">
                Boost your reach
              </h2>
              <p className="section-subtitle">
                Promote “{ad.title}” for a fixed period.
              </p>
            </div>
          </div>
          <button
            type="button"
            className="borrower-modal__close"
            onClick={onClose}
            disabled={busy}
            aria-label="Close boost dialog"
          >
            <X size={18} />
          </button>
        </header>
        <div className="borrower-modal__body boost-dialog__body">
          {error ? (
            <div className="sms-alert sms-alert--error" role="alert">
              {error}
            </div>
          ) : null}
          {isLoadingPlans ? (
            <div className="borrower-modal__state">
              Loading boost options...
            </div>
          ) : (
            <div className="boost-dialog__layout">
              <div className="boost-dialog__form">
                <section
                  className="boost-dialog__section"
                  aria-labelledby="boost-plan-label"
                >
                  <div className="boost-dialog__section-heading">
                    <span>1</span>
                    <div>
                      <h3 id="boost-plan-label">Choose a promotion period</h3>
                      <p>One-time price with no automatic renewal.</p>
                    </div>
                  </div>
                  <div className="boost-dialog__plan-grid">
                    {plans.map((plan) => {
                      const isSelected = plan.id === planId;
                      return (
                        <button
                          key={plan.id}
                          type="button"
                          className={`boost-dialog__plan${isSelected ? " boost-dialog__plan--selected" : ""}`}
                          aria-pressed={isSelected}
                          onClick={() => setPlanId(plan.id)}
                        >
                          <span>{plan.name}</span>
                          <strong>
                            LKR {(plan.amountMinor / 100).toLocaleString()}
                          </strong>
                          {isSelected ? (
                            <Check size={16} aria-hidden="true" />
                          ) : null}
                        </button>
                      );
                    })}
                  </div>
                </section>

                <section
                  className="boost-dialog__section"
                  aria-labelledby="boost-payment-label"
                >
                  <div className="boost-dialog__section-heading">
                    <span>2</span>
                    <div>
                      <h3 id="boost-payment-label">Select payment method</h3>
                      <p>
                        Availability is controlled by the platform
                        configuration.
                      </p>
                    </div>
                  </div>
                  <div className="boost-dialog__payment-grid">
                    <button
                      type="button"
                      disabled={!paymentMethods.card}
                      className={`boost-dialog__payment${paymentMethod === "card" && paymentMethods.card ? " boost-dialog__payment--selected" : ""}`}
                      aria-pressed={paymentMethod === "card"}
                      onClick={() => setPaymentMethod("card")}
                    >
                      <CreditCard size={19} />
                      <span>
                        <strong>Card payment</strong>
                        <small>
                          {paymentMethods.card
                            ? "Secure PayHere checkout"
                            : "Not configured"}
                        </small>
                      </span>
                      {paymentMethod === "card" && paymentMethods.card ? (
                        <Check size={16} />
                      ) : null}
                    </button>
                    <button
                      type="button"
                      disabled={!paymentMethods.bankTransfer}
                      className={`boost-dialog__payment${paymentMethod === "bank_transfer" && paymentMethods.bankTransfer ? " boost-dialog__payment--selected" : ""}`}
                      aria-pressed={paymentMethod === "bank_transfer"}
                      onClick={() => setPaymentMethod("bank_transfer")}
                    >
                      <Landmark size={19} />
                      <span>
                        <strong>Bank transfer</strong>
                        <small>
                          {paymentMethods.bankTransfer
                            ? "Receipt verification"
                            : "Not configured"}
                        </small>
                      </span>
                      {paymentMethod === "bank_transfer" &&
                      paymentMethods.bankTransfer ? (
                        <Check size={16} />
                      ) : null}
                    </button>
                  </div>
                </section>

                {paymentMethod === "bank_transfer" &&
                paymentMethods.bankTransfer ? (
                  <section
                    className="boost-dialog__bank-panel"
                    aria-labelledby="boost-bank-label"
                  >
                    <div>
                      <p className="eyebrow" id="boost-bank-label">
                        Transfer destination
                      </p>
                      <dl className="boost-dialog__bank-details">
                        <div>
                          <dt>Bank</dt>
                          <dd>{bankAccount.bankName}</dd>
                        </div>
                        <div>
                          <dt>Account name</dt>
                          <dd>{bankAccount.accountName}</dd>
                        </div>
                        <div>
                          <dt>Account number</dt>
                          <dd>{bankAccount.accountNumber}</dd>
                        </div>
                        <div>
                          <dt>Branch</dt>
                          <dd>{bankAccount.branch}</dd>
                        </div>
                      </dl>
                    </div>
                    <div className="boost-dialog__bank-form">
                      <label className="create-ad-field">
                        <span className="create-ad-field__label">
                          Bank reference
                        </span>
                        <input
                          className="input"
                          value={bankReference}
                          placeholder="Enter transaction reference"
                          onChange={(event) =>
                            setBankReference(event.target.value)
                          }
                        />
                      </label>
                      <label className="create-ad-field">
                        <span className="create-ad-field__label">
                          Payment receipt
                        </span>
                        <input
                          className="input boost-dialog__file-input"
                          type="file"
                          accept="image/jpeg,image/png,image/webp,application/pdf"
                          onChange={(event) =>
                            setReceipt(event.target.files?.[0] ?? null)
                          }
                        />
                        <small>
                          {receipt ? receipt.name : "JPG, PNG, WEBP or PDF"}
                        </small>
                      </label>
                    </div>
                  </section>
                ) : null}
              </div>

              <aside
                className="boost-dialog__summary"
                aria-label="Boost order summary"
              >
                <p className="eyebrow">Order summary</p>
                <h3>{selectedPlan?.name ?? "Select a plan"}</h3>
                <dl>
                  <div>
                    <dt>Advertisement</dt>
                    <dd>{ad.title}</dd>
                  </div>
                  <div>
                    <dt>Payment</dt>
                    <dd>
                      {paymentMethod === "card" ? "Card" : "Bank transfer"}
                    </dd>
                  </div>
                  <div className="boost-dialog__summary-total">
                    <dt>Total</dt>
                    <dd>
                      {selectedPlan
                        ? `LKR ${(selectedPlan.amountMinor / 100).toLocaleString()}`
                        : "—"}
                    </dd>
                  </div>
                </dl>
                <p>
                  Your advertisement remains active if you close this window
                  without purchasing a boost.
                </p>
              </aside>
            </div>
          )}
        </div>
        <footer className="boost-dialog__footer">
          {submissionLabel ? (
            <span
              className="boost-dialog__progress"
              role="status"
              aria-live="polite"
            >
              <LoaderCircle size={16} aria-hidden="true" />
              {submissionLabel}
            </span>
          ) : null}
          <button
            type="button"
            className="button button-secondary"
            onClick={onClose}
            disabled={busy}
          >
            Not now
          </button>
          <button
            type="button"
            className="button button-primary"
            onClick={() => void submit()}
            disabled={
              busy ||
              isLoadingPlans ||
              !selectedPlan ||
              (!paymentMethods.card && !paymentMethods.bankTransfer)
            }
          >
            {submissionLabel ??
              (paymentMethod === "card"
                ? "Continue to secure payment"
                : "Submit for verification")}
          </button>
        </footer>
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
  const [boostAd, setBoostAd] = useState<LenderAd | null>(null);
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
    if (!isCreateAdOpen && !selectedAd && !previewAd && !boostAd) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      if (boostAd) setBoostAd(null);
      else if (previewAd) setPreviewAd(null);
      else if (isCreateAdOpen) setIsCreateAdOpen(false);
      else setSelectedAd(null);
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [boostAd, isCreateAdOpen, previewAd, selectedAd]);

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
        onBoost={setBoostAd}
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
        onBoost={() => undefined}
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
        onBoost={() => undefined}
        onLoadMore={() => void handleLoadMore("inactive")}
      />

      {previewAd ? (
        <AdvertisementPreview
          ad={previewAd}
          session={session}
          onClose={() => setPreviewAd(null)}
        />
      ) : null}

      {boostAd ? (
        <BoostAdDialog
          ad={boostAd}
          onClose={() => setBoostAd(null)}
          onComplete={(message) => {
            setBoostAd(null);
            setAdsNotice(message);
            setAdsRefreshKey((value) => value + 1);
          }}
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
