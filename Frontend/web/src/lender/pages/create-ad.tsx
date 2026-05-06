// Ad composer for lender offer drafts, local draft persistence, and recent ad snapshots.
import { useEffect, useMemo, useState } from "react";
import type { LenderSession } from "../lib/lender-session";
import type { LenderSettings } from "../lib/lender-settings-api";
import {
  createLenderAd,
  fetchLenderAds,
  type LenderAd,
} from "../lib/lender-ads-api";

type CreateAdPageProps = {
  session: LenderSession;
  settings: LenderSettings;
};

type AdDraft = {
  headline: string;
  minAmount: string;
  maxAmount: string;
  interestRate: string;
  tenureMonths: string;
  borrowerFocus: string;
  processingTime: string;
  repaymentStyle: string;
  requirements: string;
  supportNote: string;
};

const DEFAULT_DRAFT: AdDraft = {
  headline: "Working capital loans for eligible borrowers",
  minAmount: "50000",
  maxAmount: "250000",
  interestRate: "14.5",
  tenureMonths: "12",
  borrowerFocus: "Small business owners",
  processingTime: "Review within 24 hours",
  repaymentStyle: "Monthly installments",
  requirements: "NIC, bank statements, and income proof.",
  supportNote: "Transparent terms and timely updates.",
};

function getStorageKey(lenderId: string): string {
  // Drafts are stored per lender so shared browsers do not mix multiple lenders' ad data.
  return `smart-credit:create-ad-draft:${lenderId}`;
}

function parseStoredDraft(
  value: string | null,
  fallbackDraft: AdDraft,
): AdDraft | null {
  // Stored drafts are merged with a fallback shape so newly added fields still get safe defaults.
  if (!value) {
    return null;
  }

  try {
    const parsed = JSON.parse(value) as Partial<AdDraft>;

    if (!parsed || typeof parsed !== "object") {
      return null;
    }

    return {
      headline:
        typeof parsed.headline === "string"
          ? parsed.headline
          : fallbackDraft.headline,
      minAmount:
        typeof parsed.minAmount === "string"
          ? parsed.minAmount
          : fallbackDraft.minAmount,
      maxAmount:
        typeof parsed.maxAmount === "string"
          ? parsed.maxAmount
          : fallbackDraft.maxAmount,
      interestRate:
        typeof parsed.interestRate === "string"
          ? parsed.interestRate
          : fallbackDraft.interestRate,
      tenureMonths:
        typeof parsed.tenureMonths === "string"
          ? parsed.tenureMonths
          : fallbackDraft.tenureMonths,
      borrowerFocus:
        typeof parsed.borrowerFocus === "string"
          ? parsed.borrowerFocus
          : fallbackDraft.borrowerFocus,
      processingTime:
        typeof parsed.processingTime === "string"
          ? parsed.processingTime
          : fallbackDraft.processingTime,
      repaymentStyle:
        typeof parsed.repaymentStyle === "string"
          ? parsed.repaymentStyle
          : fallbackDraft.repaymentStyle,
      requirements:
        typeof parsed.requirements === "string"
          ? parsed.requirements
          : fallbackDraft.requirements,
      supportNote:
        typeof parsed.supportNote === "string"
          ? parsed.supportNote
          : fallbackDraft.supportNote,
    };
  } catch {
    return null;
  }
}

function formatCurrency(value: string): string {
  const amount = Number(value);

  if (!Number.isFinite(amount) || amount <= 0) {
    return "LKR 0";
  }

  return new Intl.NumberFormat("en-LK", {
    style: "currency",
    currency: "LKR",
    maximumFractionDigits: 0,
  }).format(amount);
}

function formatShortDate(value: string | null): string {
  if (!value) {
    return "No date";
  }

  const parsed = new Date(value);

  if (Number.isNaN(parsed.getTime())) {
    return "No date";
  }

  return new Intl.DateTimeFormat("en-LK", {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(parsed);
}

function formatLabel(value: string): string {
  return value
    .replace(/_/g, " ")
    .replace(/\b\w/g, (character) => character.toUpperCase());
}

function getAdStatusBadgeClass(value: string): string {
  if (value === "active" || value === "approved") {
    return "badge-success";
  }

  if (value === "rejected" || value === "closed") {
    return "badge-danger";
  }

  return "badge-gray";
}

function buildOfferSummary(draft: AdDraft): string {
  // Creates the short offer copy shown in preview cards from the core lender messaging fields.
  return `${draft.processingTime}. ${draft.repaymentStyle}. ${draft.supportNote}`;
}

function formatStarterBorrowerFocus(settings: LenderSettings): string {
  const purposes = settings.lendingDefaults.preferredPurposes.join(", ");
  const regions = settings.lendingDefaults.preferredRegions.join(", ");

  if (purposes && regions) {
    return `${purposes} in ${regions}`;
  }

  if (purposes) {
    return purposes;
  }

  if (regions) {
    return regions;
  }

  return DEFAULT_DRAFT.borrowerFocus;
}

function buildStarterDraft(settings: LenderSettings): AdDraft {
  // Builds a first-pass draft from lender defaults so the form reflects saved preferences immediately.
  return {
    ...DEFAULT_DRAFT,
    minAmount: String(settings.lendingDefaults.defaultMinAmount),
    maxAmount: String(settings.lendingDefaults.defaultMaxAmount),
    interestRate: String(settings.lendingDefaults.defaultInterestRate),
    tenureMonths: String(settings.lendingDefaults.defaultMaxTenureMonths),
    borrowerFocus: formatStarterBorrowerFocus(settings),
    processingTime: `Review within ${settings.lendingDefaults.defaultResponseTimeHours} hour(s)`,
  };
}

export default function CreateAdPage({
  session,
  settings,
}: CreateAdPageProps) {
  // starterDraft changes whenever lender defaults change, but the current draft remains locally editable.
  const starterDraft = useMemo(() => buildStarterDraft(settings), [settings]);
  const [draft, setDraft] = useState<AdDraft>(
    () =>
      parseStoredDraft(
        window.localStorage.getItem(getStorageKey(session.lenderId)),
        starterDraft,
      ) ?? starterDraft,
  );
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [publishMessage, setPublishMessage] = useState<string | null>(null);
  const [publishError, setPublishError] = useState<string | null>(null);
  const [isPublishing, setIsPublishing] = useState(false);
  const [recentAds, setRecentAds] = useState<LenderAd[]>([]);
  const [isRecentAdsLoading, setIsRecentAdsLoading] = useState(true);
  const [adsError, setAdsError] = useState<string | null>(null);

  useEffect(() => {
    // Save feedback is transient so the page can reuse the same banner area without manual dismissal.
    if (!saveMessage) {
      return;
    }

    const timeout = window.setTimeout(() => setSaveMessage(null), 2400);
    return () => window.clearTimeout(timeout);
  }, [saveMessage]);

  useEffect(() => {
    // Publish feedback lasts slightly longer because it usually follows a multi-field save operation.
    if (!publishMessage) {
      return;
    }

    const timeout = window.setTimeout(() => setPublishMessage(null), 3200);
    return () => window.clearTimeout(timeout);
  }, [publishMessage]);

  useEffect(() => {
    // When either the lender or settings defaults change, reload the best available local draft for that lender.
    setDraft(
      parseStoredDraft(
        window.localStorage.getItem(getStorageKey(session.lenderId)),
        starterDraft,
      ) ?? starterDraft,
    );
  }, [session.lenderId, starterDraft]);

  useEffect(() => {
    let isMounted = true;

    // The recent ads panel is independent from the local draft and is refreshed from the API on page load.
    const loadRecentAds = async () => {
      try {
        setIsRecentAdsLoading(true);
        setAdsError(null);
        const ads = await fetchLenderAds(8);

        if (isMounted) {
          setRecentAds(ads);
        }
      } catch (error) {
        if (isMounted) {
          setRecentAds([]);
          setAdsError(
            error instanceof Error
              ? error.message
              : "Failed to load existing ads.",
          );
        }
      } finally {
        if (isMounted) {
          setIsRecentAdsLoading(false);
        }
      }
    };

    void loadRecentAds();

    return () => {
      isMounted = false;
    };
  }, [session.lenderId]);

  function updateDraft<Key extends keyof AdDraft>(
    key: Key,
    value: AdDraft[Key],
  ) {
    setDraft((current) => ({
      ...current,
      [key]: value,
    }));
  }

  function handleSaveDraft() {
    // Draft saves are local-only until the lender explicitly publishes the ad.
    window.localStorage.setItem(
      getStorageKey(session.lenderId),
      JSON.stringify(draft),
    );
    setSaveMessage("Draft saved.");
  }

  function handleResetDraft() {
    // Reset removes the stored draft and repopulates the form from current lender defaults.
    setDraft(starterDraft);
    window.localStorage.removeItem(getStorageKey(session.lenderId));
    setSaveMessage("Draft reset.");
  }

  async function handlePublishAd() {
    // Publishing persists the current draft and then refreshes the recent ads snapshot from the server copy.
    try {
      setIsPublishing(true);
      setPublishError(null);
      setPublishMessage(null);

      const createdAd = await createLenderAd({
        headline: draft.headline.trim(),
        minAmount: Number(draft.minAmount),
        maxAmount: Number(draft.maxAmount),
        interestRate: Number(draft.interestRate),
        tenureMonths: Number(draft.tenureMonths),
        borrowerFocus: draft.borrowerFocus.trim(),
        processingTime: draft.processingTime.trim(),
        repaymentStyle: draft.repaymentStyle.trim(),
        requirements: draft.requirements.trim(),
        supportNote: draft.supportNote.trim(),
      });

      window.localStorage.setItem(
        getStorageKey(session.lenderId),
        JSON.stringify(draft),
      );
      setRecentAds((current) =>
        [createdAd, ...current.filter((ad) => ad.id !== createdAd.id)].slice(
          0,
          8,
        ),
      );
      try {
        setIsRecentAdsLoading(true);
        const ads = await fetchLenderAds(8);
        setRecentAds(ads);
      } catch (refreshError) {
        setAdsError(
          refreshError instanceof Error
            ? refreshError.message
            : "Failed to refresh existing ads.",
        );
      } finally {
        setIsRecentAdsLoading(false);
      }
      setPublishMessage(`Ad published successfully as ${createdAd.id}.`);
    } catch (error) {
      setPublishError(
        error instanceof Error ? error.message : "Failed to publish lender ad.",
      );
    } finally {
      setIsPublishing(false);
    }
  }

  const amountRange = `${formatCurrency(draft.minAmount)} - ${formatCurrency(draft.maxAmount)}`;
  const previewStatus = recentAds[0]?.status ?? "preview only";
  const qualitySignals = [
    draft.headline.trim().length >= 18 ? "Headline added" : "Add headline",
    Number(draft.interestRate) > 0 ? "Rate added" : "Add interest rate",
    draft.requirements.trim().length >= 24
      ? "Requirements added"
      : "Add requirements",
    draft.supportNote.trim().length >= 20
      ? "Trust note added"
      : "Add trust note",
  ];
  const activeAdsCount = recentAds.filter((ad) =>
    ["active", "approved"].includes(ad.status),
  ).length;
  const totalApplications = recentAds.reduce(
    (sum, ad) => sum + ad.applicationCount,
    0,
  );
  const totalFundedLoans = recentAds.reduce(
    (sum, ad) => sum + ad.fundedLoansCount,
    0,
  );

  return (
    <section className="dashboard-panel">
      <header className="page-header">
        <div>
          <p className="eyebrow">Ads</p>
          <h1 className="page-title">Create Ad</h1>
          <p className="page-subtitle">Create and publish a lender ad.</p>
          <p className="dashboard-context-pill">{session.displayName}</p>
        </div>
      </header>

      <section className="create-ad-hero">
        <article className="card create-ad-hero__story">
          <div className="create-ad-hero__badge">Ad setup</div>
          <h2 className="section-title">Create a clear offer</h2>
          <p className="section-subtitle">Set the main terms before publishing.</p>
          <div className="create-ad-hero__chips">
            <span className="create-ad-chip">Amounts</span>
            <span className="create-ad-chip">Rate</span>
            <span className="create-ad-chip">Documents</span>
          </div>
        </article>

        <article className="card create-ad-hero__score">
          <p className="create-ad-score__label">Checklist</p>
          <div className="create-ad-score__value">
            {
              qualitySignals.filter(
                (item) =>
                  !item.startsWith("Strengthen") && !item.startsWith("Add"),
              ).length
            }
            /4
          </div>
          <div className="create-ad-score__list">
            {qualitySignals.map((signal) => (
              <div className="create-ad-score__item" key={signal}>
                <span className="create-ad-score__dot" aria-hidden="true" />
                <p>{signal}</p>
              </div>
            ))}
          </div>
        </article>
      </section>

      <section className="create-ad-layout">
        <article className="card create-ad-form-card">
          <div className="create-ad-form-card__header">
            <div>
              <h2 className="section-title">Ad Builder</h2>
              <p className="section-subtitle">Enter the main offer details.</p>
            </div>
          </div>

          {saveMessage ? (
            <p className="create-ad-banner">{saveMessage}</p>
          ) : null}
          {publishMessage ? (
            <p className="create-ad-banner create-ad-banner--primary">
              {publishMessage}
            </p>
          ) : null}
          {publishError ? (
            <p className="create-ad-banner create-ad-banner--error">
              {publishError}
            </p>
          ) : null}

          <div className="create-ad-form-grid">
            <label className="create-ad-field create-ad-field--full">
              <span className="create-ad-field__label">Ad headline</span>
              <input
                className="input"
                type="text"
                value={draft.headline}
                onChange={(event) =>
                  updateDraft("headline", event.target.value)
                }
                placeholder="Ex: Flexible personal loans for salary earners"
              />
            </label>

            <label className="create-ad-field">
              <span className="create-ad-field__label">Minimum amount</span>
              <input
                className="input"
                type="number"
                min="0"
                value={draft.minAmount}
                onChange={(event) =>
                  updateDraft("minAmount", event.target.value)
                }
                placeholder="50000"
              />
            </label>

            <label className="create-ad-field">
              <span className="create-ad-field__label">Maximum amount</span>
              <input
                className="input"
                type="number"
                min="0"
                value={draft.maxAmount}
                onChange={(event) =>
                  updateDraft("maxAmount", event.target.value)
                }
                placeholder="250000"
              />
            </label>

            <label className="create-ad-field">
              <span className="create-ad-field__label">Interest rate %</span>
              <input
                className="input"
                type="number"
                min="0"
                step="0.1"
                value={draft.interestRate}
                onChange={(event) =>
                  updateDraft("interestRate", event.target.value)
                }
                placeholder="14.5"
              />
            </label>

            <label className="create-ad-field">
              <span className="create-ad-field__label">Tenure in months</span>
              <input
                className="input"
                type="number"
                min="1"
                value={draft.tenureMonths}
                onChange={(event) =>
                  updateDraft("tenureMonths", event.target.value)
                }
                placeholder="12"
              />
            </label>

            <label className="create-ad-field create-ad-field--full">
              <span className="create-ad-field__label">Best-fit borrower</span>
              <input
                className="input"
                type="text"
                value={draft.borrowerFocus}
                onChange={(event) =>
                  updateDraft("borrowerFocus", event.target.value)
                }
                placeholder="Who should apply for this offer?"
              />
            </label>

            <label className="create-ad-field">
              <span className="create-ad-field__label">Review speed</span>
              <input
                className="input"
                type="text"
                value={draft.processingTime}
                onChange={(event) =>
                  updateDraft("processingTime", event.target.value)
                }
                placeholder="Approval within 24 hours"
              />
            </label>

            <label className="create-ad-field">
              <span className="create-ad-field__label">Repayment style</span>
              <input
                className="input"
                type="text"
                value={draft.repaymentStyle}
                onChange={(event) =>
                  updateDraft("repaymentStyle", event.target.value)
                }
                placeholder="Monthly installments"
              />
            </label>

            <label className="create-ad-field create-ad-field--full">
              <span className="create-ad-field__label">Required documents</span>
              <textarea
                className="create-ad-textarea"
                value={draft.requirements}
                onChange={(event) =>
                  updateDraft("requirements", event.target.value)
                }
                rows={4}
                placeholder="List the documents or proof you expect from the borrower."
              />
            </label>

            <label className="create-ad-field create-ad-field--full">
              <span className="create-ad-field__label">Trust note</span>
              <textarea
                className="create-ad-textarea"
                value={draft.supportNote}
                onChange={(event) =>
                  updateDraft("supportNote", event.target.value)
                }
                rows={3}
                placeholder="Add a short trust note."
              />
            </label>
          </div>

          <div className="create-ad-form-card__footer">
            <div className="create-ad-form-card__actions">
              <button
                type="button"
                className="create-ad-button create-ad-button--ghost"
                onClick={handleResetDraft}
                disabled={isPublishing}
              >
                Reset
              </button>
              <button
                type="button"
                className="create-ad-button"
                onClick={handleSaveDraft}
                disabled={isPublishing}
              >
                Save Draft
              </button>
              <button
                type="button"
                className="create-ad-button create-ad-button--primary"
                onClick={handlePublishAd}
                disabled={isPublishing}
              >
                {isPublishing ? "Publishing..." : "Publish Ad"}
              </button>
            </div>
          </div>
        </article>

        <aside className="create-ad-preview-column">
          <article className="card create-ad-preview-card">
            <div className="create-ad-preview-card__top">
              <div>
                <p className="create-ad-preview-card__eyebrow">Live preview</p>
                <h2 className="section-title">Preview</h2>
              </div>
              <span className="badge badge-gray">{previewStatus}</span>
            </div>

            <div className="create-ad-preview">
              <div className="create-ad-preview__brand">
                <div className="create-ad-preview__logo">
                  {session.displayName.slice(0, 1).toUpperCase()}
                </div>
                <div>
                  <p className="create-ad-preview__name">
                    {session.displayName}
                  </p>
                  <p className="create-ad-preview__meta">Lender</p>
                </div>
              </div>

              <h3 className="create-ad-preview__title">
                {draft.headline || "Your lending headline will appear here"}
              </h3>

              <div className="create-ad-preview__metrics">
                <article className="create-ad-preview__metric">
                  <span>Amount Range</span>
                  <strong>{amountRange}</strong>
                </article>
                <article className="create-ad-preview__metric">
                  <span>Interest Rate</span>
                  <strong>{draft.interestRate || "0"}%</strong>
                </article>
                <article className="create-ad-preview__metric">
                  <span>Tenure</span>
                  <strong>{draft.tenureMonths || "0"} months</strong>
                </article>
              </div>

              <div className="create-ad-preview__section">
                <p className="create-ad-preview__label">Best for</p>
                <p>
                  {draft.borrowerFocus ||
                    "Add borrower type."}
                </p>
              </div>

              <div className="create-ad-preview__section">
                <p className="create-ad-preview__label">Offer summary</p>
                <p>{buildOfferSummary(draft)}</p>
              </div>

              <div className="create-ad-preview__section">
                <p className="create-ad-preview__label">Requirements</p>
                <p>
                  {draft.requirements || "Add required documents."}
                </p>
              </div>
            </div>
          </article>
        </aside>
      </section>

      <section className="card create-ad-tips-card create-ad-tips-card--fullwidth">
        <div className="create-ad-form-card__header">
          <div>
            <h2 className="section-title">Existing Ads</h2>
            <p className="section-subtitle">Recent ad portfolio.</p>
          </div>
          <span className="dashboard-context-pill">
            {recentAds.length} loaded
          </span>
        </div>
        {adsError ? (
          <p className="create-ad-banner create-ad-banner--error">{adsError}</p>
        ) : null}
        <div className="create-ad-portfolio">
          {isRecentAdsLoading ? (
            <article className="create-ad-portfolio-state">
              <strong>Loading ads...</strong>
              <p>Please wait while we load your recent ads.</p>
            </article>
          ) : recentAds.length > 0 ? (
            <>
              <div className="create-ad-portfolio__summary">
                <article className="create-ad-portfolio-stat">
                  <span className="create-ad-portfolio-stat__label">
                    Active Ads
                  </span>
                  <strong className="create-ad-portfolio-stat__value">
                    {activeAdsCount}
                  </strong>
                </article>
                <article className="create-ad-portfolio-stat">
                  <span className="create-ad-portfolio-stat__label">
                    Applications
                  </span>
                  <strong className="create-ad-portfolio-stat__value">
                    {totalApplications}
                  </strong>
                </article>
                <article className="create-ad-portfolio-stat">
                  <span className="create-ad-portfolio-stat__label">
                    Funded Loans
                  </span>
                  <strong className="create-ad-portfolio-stat__value">
                    {totalFundedLoans}
                  </strong>
                </article>
              </div>

              <div className="create-ad-portfolio__grid">
                {recentAds.map((ad) => (
                  <article className="create-ad-portfolio-card" key={ad.id}>
                    <div className="create-ad-portfolio-card__top">
                      <div className="create-ad-portfolio-card__title-wrap">
                        <p className="create-ad-portfolio-card__eyebrow">
                          {ad.adId || ad.id}
                        </p>
                        <h3 className="create-ad-portfolio-card__title">
                          {ad.title}
                        </h3>
                        <p className="create-ad-portfolio-card__description">
                          {ad.description}
                        </p>
                      </div>

                      <div className="create-ad-portfolio-card__status">
                        <span
                          className={`badge ${getAdStatusBadgeClass(ad.status)}`}
                        >
                          {formatLabel(ad.status)}
                        </span>
                        {ad.isBoosted ? (
                          <span className="create-ad-portfolio-card__flag">
                            Boosted
                          </span>
                        ) : null}
                      </div>
                    </div>

                    <div className="create-ad-portfolio-card__metrics">
                      <article className="create-ad-portfolio-metric">
                        <span>Amount</span>
                        <strong>
                          {formatCurrency(String(ad.minAmount))} -{" "}
                          {formatCurrency(String(ad.maxAmount))}
                        </strong>
                      </article>
                      <article className="create-ad-portfolio-metric">
                        <span>Interest</span>
                        <strong>{ad.preferredInterestRate}%</strong>
                      </article>
                      <article className="create-ad-portfolio-metric">
                        <span>Tenure</span>
                        <strong>{ad.maxTenureMonths} months</strong>
                      </article>
                      <article className="create-ad-portfolio-metric">
                        <span>Capital</span>
                        <strong>
                          {formatCurrency(String(ad.availableCapital))}
                        </strong>
                      </article>
                    </div>

                    <div className="create-ad-portfolio-card__stats">
                      <div className="create-ad-portfolio-card__stat">
                        <span>Applications</span>
                        <strong>{ad.applicationCount}</strong>
                      </div>
                      <div className="create-ad-portfolio-card__stat">
                        <span>Funded</span>
                        <strong>{ad.fundedLoansCount}</strong>
                      </div>
                      <div className="create-ad-portfolio-card__stat">
                        <span>Response</span>
                        <strong>{ad.responseTimeHours} hrs</strong>
                      </div>
                      <div className="create-ad-portfolio-card__stat">
                        <span>Expires</span>
                        <strong>{formatShortDate(ad.expiresAt)}</strong>
                      </div>
                    </div>

                    <div className="create-ad-portfolio-card__footer">
                      <div className="create-ad-portfolio-card__tags">
                        {(ad.preferredPurposes.length > 0
                          ? ad.preferredPurposes
                          : ["No purpose"]
                        )
                          .slice(0, 3)
                          .map((purpose) => (
                            <span
                              className="create-ad-portfolio-card__tag"
                              key={`${ad.id}-${purpose}`}
                            >
                              {purpose}
                            </span>
                          ))}
                      </div>
                      <p className="create-ad-portfolio-card__meta">
                        Created {formatShortDate(ad.createdAt)} • Updated{" "}
                        {formatShortDate(ad.updatedAt)}
                      </p>
                    </div>
                  </article>
                ))}
              </div>
            </>
          ) : (
            <article className="create-ad-portfolio-state">
              <strong>No ads yet</strong>
              <p>Create your first ad to build your portfolio.</p>
            </article>
          )}
        </div>
      </section>
    </section>
  );
}
