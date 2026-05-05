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
  headline: "Fast working-capital support for reliable borrowers",
  minAmount: "50000",
  maxAmount: "250000",
  interestRate: "14.5",
  tenureMonths: "12",
  borrowerFocus: "Small business owners with stable monthly cash flow",
  processingTime: "Approval review within 24 hours",
  repaymentStyle: "Monthly installments",
  requirements:
    "NIC, bank statements, business or salary proof, and a clear repayment plan.",
  supportNote:
    "Friendly review, transparent pricing, and updates at every step of approval.",
};

function getStorageKey(lenderId: string): string {
  return `smart-credit:create-ad-draft:${lenderId}`;
}

function parseStoredDraft(
  value: string | null,
  fallbackDraft: AdDraft,
): AdDraft | null {
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

function buildOfferSummary(draft: AdDraft): string {
  return `${draft.processingTime}. ${draft.repaymentStyle}. ${draft.supportNote}`;
}

function formatStarterBorrowerFocus(settings: LenderSettings): string {
  const purposes = settings.lendingDefaults.preferredPurposes.join(", ");
  const regions = settings.lendingDefaults.preferredRegions.join(", ");

  if (purposes && regions) {
    return `Borrowers seeking ${purposes} support in ${regions} with stable monthly cash flow`;
  }

  if (purposes) {
    return `Borrowers seeking ${purposes} support with stable monthly cash flow`;
  }

  if (regions) {
    return `Borrowers based in ${regions} with stable monthly cash flow`;
  }

  return DEFAULT_DRAFT.borrowerFocus;
}

function buildStarterDraft(settings: LenderSettings): AdDraft {
  return {
    ...DEFAULT_DRAFT,
    minAmount: String(settings.lendingDefaults.defaultMinAmount),
    maxAmount: String(settings.lendingDefaults.defaultMaxAmount),
    interestRate: String(settings.lendingDefaults.defaultInterestRate),
    tenureMonths: String(settings.lendingDefaults.defaultMaxTenureMonths),
    borrowerFocus: formatStarterBorrowerFocus(settings),
    processingTime: `Approval review within ${settings.lendingDefaults.defaultResponseTimeHours} hour(s)`,
  };
}

export default function CreateAdPage({
  session,
  settings,
}: CreateAdPageProps) {
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
    if (!saveMessage) {
      return;
    }

    const timeout = window.setTimeout(() => setSaveMessage(null), 2400);
    return () => window.clearTimeout(timeout);
  }, [saveMessage]);

  useEffect(() => {
    if (!publishMessage) {
      return;
    }

    const timeout = window.setTimeout(() => setPublishMessage(null), 3200);
    return () => window.clearTimeout(timeout);
  }, [publishMessage]);

  useEffect(() => {
    setDraft(
      parseStoredDraft(
        window.localStorage.getItem(getStorageKey(session.lenderId)),
        starterDraft,
      ) ?? starterDraft,
    );
  }, [session.lenderId, starterDraft]);

  useEffect(() => {
    let isMounted = true;

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
    window.localStorage.setItem(
      getStorageKey(session.lenderId),
      JSON.stringify(draft),
    );
    setSaveMessage("Draft saved locally for this lender.");
  }

  function handleResetDraft() {
    setDraft(starterDraft);
    window.localStorage.removeItem(getStorageKey(session.lenderId));
    setSaveMessage("Draft reset to your lender defaults.");
  }

  async function handlePublishAd() {
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
    draft.headline.trim().length >= 18
      ? "Clear value headline"
      : "Strengthen your headline",
    Number(draft.interestRate) > 0 ? "Pricing is visible" : "Add interest rate",
    draft.requirements.trim().length >= 24
      ? "Borrower requirements are clear"
      : "Explain borrower requirements",
    draft.supportNote.trim().length >= 20
      ? "Human trust note included"
      : "Add a trust-building note",
  ];

  return (
    <section className="dashboard-panel">
      <header className="page-header">
        <div>
          <p className="eyebrow">Lender growth tool</p>
          <h1 className="page-title">Create Ad</h1>
          <p className="page-subtitle">
            Build a simple lending offer that feels trustworthy, attractive, and
            easy for the right borrower to understand.
          </p>
          <p className="dashboard-context-pill">
            Draft owner: {session.displayName} - {session.lenderId}
          </p>
        </div>
      </header>

      <section className="create-ad-hero">
        <article className="card create-ad-hero__story">
          <div className="create-ad-hero__badge">Offer quality</div>
          <h2 className="section-title">
            A strong ad should feel clear, trustworthy, and easy to act on
          </h2>
          <p className="section-subtitle">
            Borrowers usually decide in seconds whether a lender looks safe and
            professional. A clean offer with visible numbers and stable terms
            wins more trust than a complicated ad.
          </p>
          <div className="create-ad-hero__chips">
            <span className="create-ad-chip">Transparent pricing</span>
            <span className="create-ad-chip">Fast review promise</span>
            <span className="create-ad-chip">Human support tone</span>
          </div>
        </article>

        <article className="card create-ad-hero__score">
          <p className="create-ad-score__label">Ad quality signals</p>
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
              <p className="section-subtitle">
                Keep it simple. Say what you offer, who it is for, and why the
                borrower should trust the process.
              </p>
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
                placeholder="What makes your process feel safe, fair, and professional?"
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
                <h2 className="section-title">Borrower-facing ad</h2>
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
                  <p className="create-ad-preview__meta">
                    Verified lender profile
                  </p>
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
                    "Describe the borrower segment you want to attract."}
                </p>
              </div>

              <div className="create-ad-preview__section">
                <p className="create-ad-preview__label">
                  Why borrowers feel safe
                </p>
                <p>{buildOfferSummary(draft)}</p>
              </div>

              <div className="create-ad-preview__section">
                <p className="create-ad-preview__label">Requirements</p>
                <p>
                  {draft.requirements ||
                    "Explain the documents and checks clearly."}
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
            <p className="section-subtitle">
              Your published offers live here so you can compare active terms,
              spot gaps, and see what borrowers already see.
            </p>
          </div>
          <span className="dashboard-context-pill">
            {recentAds.length} loaded
          </span>
        </div>
        {adsError ? (
          <p className="create-ad-banner create-ad-banner--error">{adsError}</p>
        ) : null}
        <div className="create-ad-tips-card__list create-ad-tips-card__list--detailed">
          {isRecentAdsLoading ? (
            <article className="create-ad-tip">
              <p>Loading existing ads...</p>
            </article>
          ) : recentAds.length > 0 ? (
            recentAds.map((ad) => (
              <article
                className="create-ad-tip create-ad-tip--detailed"
                key={ad.id}
              >
                <div className="create-ad-tip__header">
                  <strong>{ad.title}</strong>
                  <span className="badge badge-gray">{ad.status}</span>
                </div>
                <p>{ad.description}</p>
                <div className="create-ad-tip__grid">
                  <span>
                    Amount: {formatCurrency(String(ad.minAmount))} -{" "}
                    {formatCurrency(String(ad.maxAmount))}
                  </span>
                  <span>Interest: {ad.preferredInterestRate}%</span>
                  <span>Tenure: {ad.maxTenureMonths} months</span>
                  <span>
                    Capital: {formatCurrency(String(ad.availableCapital))}
                  </span>
                  <span>Applications: {ad.applicationCount}</span>
                  <span>Funded: {ad.fundedLoansCount}</span>
                  <span>Response: {ad.responseTimeHours} hrs</span>
                  <span>Expires: {formatShortDate(ad.expiresAt)}</span>
                </div>
                <p className="create-ad-tip__meta">
                  Created {formatShortDate(ad.createdAt)} | Updated{" "}
                  {formatShortDate(ad.updatedAt)} |{" "}
                  {ad.preferredPurposes.join(", ") || "No preferred purposes"}
                </p>
              </article>
            ))
          ) : (
            <article className="create-ad-tip">
              <strong>No ads published yet</strong>
              <p>
                Publish your first lender ad from this page and it will appear
                here after Firestore saves it.
              </p>
            </article>
          )}
        </div>
      </section>
    </section>
  );
}
