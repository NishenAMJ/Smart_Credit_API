import { useEffect, useMemo, useState } from "react";
import {
  BadgeCheck,
  Banknote,
  CalendarClock,
  Check,
  Eye,
  FileCheck2,
  RotateCcw,
  Save,
  Send,
  Users,
  X,
} from "lucide-react";
import type { LenderSession } from "../lib/lender-session";
import { createLenderAd } from "../lib/lender-ads-api";
import { fetchLenderProfile } from "../lib/lender-profile-api";

type CreateAdPageProps = {
  session: LenderSession;
  embedded?: boolean;
  onPublished?: () => void;
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

type DraftErrors = Partial<Record<keyof AdDraft, string>>;

const EMPTY_DRAFT: AdDraft = {
  headline: "",
  minAmount: "",
  maxAmount: "",
  interestRate: "",
  tenureMonths: "",
  borrowerFocus: "",
  processingTime: "Within 2 business days",
  repaymentStyle: "Monthly installments",
  requirements: "",
  supportNote: "",
};

function getStorageKey(lenderId: string): string {
  return `smart-credit:create-ad-draft:v2:${lenderId}`;
}

function parseStoredDraft(value: string | null): AdDraft | null {
  if (!value) return null;

  try {
    const parsed = JSON.parse(value) as Partial<AdDraft>;
    if (!parsed || typeof parsed !== "object") return null;

    return Object.fromEntries(
      Object.entries(EMPTY_DRAFT).map(([key, fallback]) => [
        key,
        typeof parsed[key as keyof AdDraft] === "string"
          ? parsed[key as keyof AdDraft]
          : fallback,
      ]),
    ) as AdDraft;
  } catch {
    return null;
  }
}

function validateDraft(draft: AdDraft): DraftErrors {
  const errors: DraftErrors = {};
  const minAmount = Number(draft.minAmount);
  const maxAmount = Number(draft.maxAmount);
  const interestRate = Number(draft.interestRate);
  const tenureMonths = Number(draft.tenureMonths);

  if (draft.headline.trim().length < 12)
    errors.headline = "Use at least 12 characters.";
  if (!Number.isFinite(minAmount) || minAmount <= 0) {
    errors.minAmount = "Enter a valid minimum amount.";
  }
  if (!Number.isFinite(maxAmount) || maxAmount <= 0) {
    errors.maxAmount = "Enter a valid maximum amount.";
  } else if (Number.isFinite(minAmount) && maxAmount < minAmount) {
    errors.maxAmount = "Must be equal to or above the minimum.";
  }
  if (
    !Number.isFinite(interestRate) ||
    interestRate <= 0 ||
    interestRate > 100
  ) {
    errors.interestRate = "Enter an annual rate between 0 and 100.";
  }
  if (
    !Number.isInteger(tenureMonths) ||
    tenureMonths <= 0 ||
    tenureMonths > 120
  ) {
    errors.tenureMonths = "Enter a whole number from 1 to 120.";
  }
  if (draft.borrowerFocus.trim().length < 8) {
    errors.borrowerFocus = "Describe the intended borrowers.";
  }
  if (draft.requirements.trim().length < 12) {
    errors.requirements = "Explain the required documents or checks.";
  }
  if (draft.supportNote.trim().length < 12) {
    errors.supportNote = "Add a short, clear offer description.";
  }

  return errors;
}

function formatCurrency(value: string | number): string {
  const amount = Number(value);
  if (!Number.isFinite(amount) || amount <= 0) return "Not set";

  return new Intl.NumberFormat("en-LK", {
    style: "currency",
    currency: "LKR",
    maximumFractionDigits: 0,
  }).format(amount);
}

function FieldError({ message }: { message?: string }) {
  return message ? (
    <span className="create-ad-field__error">{message}</span>
  ) : null;
}

export default function CreateAdPage({
  session,
  embedded = false,
  onPublished,
}: CreateAdPageProps) {
  const [draft, setDraft] = useState<AdDraft>(
    () =>
      parseStoredDraft(
        window.localStorage.getItem(getStorageKey(session.lenderId)),
      ) ?? EMPTY_DRAFT,
  );
  const [showValidation, setShowValidation] = useState(false);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [publishMessage, setPublishMessage] = useState<string | null>(null);
  const [publishError, setPublishError] = useState<string | null>(null);
  const [isPublishing, setIsPublishing] = useState(false);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [kycStatus, setKycStatus] = useState<string | null>(null);
  const errors = useMemo(() => validateDraft(draft), [draft]);

  useEffect(() => {
    let active = true;
    void fetchLenderProfile(session.lenderId)
      .then((profile) => {
        if (active) setKycStatus(profile.kycStatus);
      })
      .catch(() => {
        if (active) setKycStatus("unavailable");
      });
    return () => {
      active = false;
    };
  }, [session.lenderId]);

  useEffect(() => {
    if (!saveMessage && !publishMessage) return;
    const timeout = window.setTimeout(() => {
      setSaveMessage(null);
      setPublishMessage(null);
    }, 3200);
    return () => window.clearTimeout(timeout);
  }, [publishMessage, saveMessage]);

  useEffect(() => {
    if (!isPreviewOpen) return;

    const closePreview = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      event.preventDefault();
      event.stopImmediatePropagation();
      setIsPreviewOpen(false);
    };

    window.addEventListener("keydown", closePreview, true);
    return () => window.removeEventListener("keydown", closePreview, true);
  }, [isPreviewOpen]);

  function updateDraft<Key extends keyof AdDraft>(
    key: Key,
    value: AdDraft[Key],
  ) {
    setDraft((current) => ({ ...current, [key]: value }));
    setPublishError(null);
  }

  function handleSaveDraft() {
    window.localStorage.setItem(
      getStorageKey(session.lenderId),
      JSON.stringify(draft),
    );
    setSaveMessage("Draft saved on this device.");
  }

  function handleResetDraft() {
    setDraft(EMPTY_DRAFT);
    setShowValidation(false);
    setPublishError(null);
    window.localStorage.removeItem(getStorageKey(session.lenderId));
    setSaveMessage("Draft cleared.");
  }

  async function handlePublishAd() {
    setShowValidation(true);
    setPublishError(null);
    setPublishMessage(null);

    if (kycStatus !== "approved") {
      setPublishError(
        "Your KYC must be approved by an administrator before you can submit an advertisement.",
      );
      return;
    }

    if (Object.keys(errors).length > 0) {
      setPublishError("Review the highlighted fields before submitting.");
      return;
    }

    try {
      setIsPublishing(true);
      await createLenderAd({
        headline: draft.headline.trim(),
        minAmount: Number(draft.minAmount),
        maxAmount: Number(draft.maxAmount),
        interestRate: Number(draft.interestRate),
        tenureMonths: Number(draft.tenureMonths),
        borrowerFocus: draft.borrowerFocus.trim(),
        processingTime: draft.processingTime,
        repaymentStyle: draft.repaymentStyle,
        requirements: draft.requirements.trim(),
        supportNote: draft.supportNote.trim(),
      });

      setDraft(EMPTY_DRAFT);
      setShowValidation(false);
      window.localStorage.removeItem(getStorageKey(session.lenderId));
      setPublishMessage("Advertisement submitted for admin review.");
      onPublished?.();
    } catch (error) {
      setPublishError(
        error instanceof Error
          ? error.message
          : "Failed to submit advertisement.",
      );
    } finally {
      setIsPublishing(false);
    }
  }

  const amountRange =
    draft.minAmount || draft.maxAmount
      ? `${formatCurrency(draft.minAmount)} – ${formatCurrency(draft.maxAmount)}`
      : "Set an amount range";

  const inputError = (key: keyof AdDraft) =>
    showValidation && Boolean(errors[key]);

  return (
    <section className={embedded ? "create-ad-embedded" : "dashboard-panel"}>
      {!embedded ? (
        <header className="page-header create-ad-page-header">
          <div>
            <h1 className="page-title">Create advertisement</h1>
            <p className="page-subtitle">
              Define a clear offer for borrowers. New advertisements are
              reviewed before publishing.
            </p>
          </div>
        </header>
      ) : null}

      <section className="create-ad-layout create-ad-layout--form-only">
        <form
          className="card create-ad-form-card"
          onSubmit={(event) => {
            event.preventDefault();
            void handlePublishAd();
          }}
          noValidate
        >
          <div className="create-ad-form-card__header">
            <div>
              <p className="create-ad-section-kicker">Advertisement details</p>
              <h2 className="section-title">Build your lending offer</h2>
              <p className="create-ad-section-copy">
                Required fields are marked with an asterisk.
              </p>
            </div>
            <button
              type="button"
              className="create-ad-preview-toggle"
              onClick={() => setIsPreviewOpen(true)}
              aria-haspopup="dialog"
            >
              <Eye size={16} /> Preview
            </button>
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
            <p
              className="create-ad-banner create-ad-banner--error"
              role="alert"
            >
              {publishError}
            </p>
          ) : null}
          {kycStatus && kycStatus !== "approved" ? (
            <p className="create-ad-banner create-ad-banner--error" role="status">
              Advertisement submission is locked until your lender KYC is approved.
              Current status: {kycStatus.replace(/_/g, " ")}.
            </p>
          ) : null}

          <fieldset className="create-ad-fieldset">
            <legend>
              <span className="create-ad-fieldset__icon">
                <FileCheck2 size={18} />
              </span>
              Offer overview
            </legend>
            <div className="create-ad-form-grid">
              <label className="create-ad-field create-ad-field--full">
                <span className="create-ad-field__label">Title *</span>
                <input
                  className="input"
                  type="text"
                  value={draft.headline}
                  onChange={(event) =>
                    updateDraft("headline", event.target.value)
                  }
                  placeholder="Example: Flexible working capital for small businesses"
                  maxLength={90}
                  aria-invalid={inputError("headline")}
                />
                <FieldError
                  message={showValidation ? errors.headline : undefined}
                />
              </label>
              <label className="create-ad-field create-ad-field--full">
                <span className="create-ad-field__label">
                  Intended borrowers *
                </span>
                <input
                  className="input"
                  type="text"
                  value={draft.borrowerFocus}
                  onChange={(event) =>
                    updateDraft("borrowerFocus", event.target.value)
                  }
                  placeholder="Example: Registered small-business owners"
                  maxLength={100}
                  aria-invalid={inputError("borrowerFocus")}
                />
                <FieldError
                  message={showValidation ? errors.borrowerFocus : undefined}
                />
              </label>
            </div>
          </fieldset>

          <fieldset className="create-ad-fieldset">
            <legend>
              <span className="create-ad-fieldset__icon">
                <Banknote size={18} />
              </span>
              Financial terms
            </legend>
            <div className="create-ad-form-grid">
              <label className="create-ad-field">
                <span className="create-ad-field__label">
                  Minimum amount (LKR) *
                </span>
                <input
                  className="input"
                  type="number"
                  min="1"
                  value={draft.minAmount}
                  onChange={(event) =>
                    updateDraft("minAmount", event.target.value)
                  }
                  placeholder="50000"
                  aria-invalid={inputError("minAmount")}
                />
                <FieldError
                  message={showValidation ? errors.minAmount : undefined}
                />
              </label>
              <label className="create-ad-field">
                <span className="create-ad-field__label">
                  Maximum amount (LKR) *
                </span>
                <input
                  className="input"
                  type="number"
                  min="1"
                  value={draft.maxAmount}
                  onChange={(event) =>
                    updateDraft("maxAmount", event.target.value)
                  }
                  placeholder="250000"
                  aria-invalid={inputError("maxAmount")}
                />
                <FieldError
                  message={showValidation ? errors.maxAmount : undefined}
                />
              </label>
              <label className="create-ad-field">
                <span className="create-ad-field__label">
                  Annual interest rate (%) *
                </span>
                <input
                  className="input"
                  type="number"
                  min="0.1"
                  max="100"
                  step="0.1"
                  value={draft.interestRate}
                  onChange={(event) =>
                    updateDraft("interestRate", event.target.value)
                  }
                  placeholder="14.5"
                  aria-invalid={inputError("interestRate")}
                />
                <FieldError
                  message={showValidation ? errors.interestRate : undefined}
                />
              </label>
              <label className="create-ad-field">
                <span className="create-ad-field__label">
                  Maximum tenure (months) *
                </span>
                <input
                  className="input"
                  type="number"
                  min="1"
                  max="120"
                  step="1"
                  value={draft.tenureMonths}
                  onChange={(event) =>
                    updateDraft("tenureMonths", event.target.value)
                  }
                  placeholder="12"
                  aria-invalid={inputError("tenureMonths")}
                />
                <FieldError
                  message={showValidation ? errors.tenureMonths : undefined}
                />
              </label>
            </div>
            <p className="create-ad-fixed-term">
              <CalendarClock size={16} /> Repayments are collected monthly.
            </p>
          </fieldset>

          <fieldset className="create-ad-fieldset">
            <legend>
              <span className="create-ad-fieldset__icon">
                <Users size={18} />
              </span>
              Review information
            </legend>
            <div className="create-ad-form-grid">
              <label className="create-ad-field create-ad-field--full">
                <span className="create-ad-field__label">
                  Expected review time *
                </span>
                <select
                  className="input"
                  value={draft.processingTime}
                  onChange={(event) =>
                    updateDraft("processingTime", event.target.value)
                  }
                >
                  <option value="Within 24 hours">Within 24 hours</option>
                  <option value="Within 2 business days">
                    Within 2 business days
                  </option>
                  <option value="Within 3 business days">
                    Within 3 business days
                  </option>
                </select>
              </label>
              <label className="create-ad-field create-ad-field--full">
                <span className="create-ad-field__label">
                  Eligibility and documents *
                </span>
                <textarea
                  className="create-ad-textarea"
                  value={draft.requirements}
                  onChange={(event) =>
                    updateDraft("requirements", event.target.value)
                  }
                  rows={3}
                  placeholder="List the documents and eligibility checks borrowers should prepare."
                  maxLength={350}
                  aria-invalid={inputError("requirements")}
                />
                <FieldError
                  message={showValidation ? errors.requirements : undefined}
                />
              </label>
              <label className="create-ad-field create-ad-field--full">
                <span className="create-ad-field__label">Description *</span>
                <textarea
                  className="create-ad-textarea"
                  value={draft.supportNote}
                  onChange={(event) =>
                    updateDraft("supportNote", event.target.value)
                  }
                  rows={4}
                  placeholder="Explain the offer in plain language without promising approval."
                  maxLength={500}
                  aria-invalid={inputError("supportNote")}
                />
                <FieldError
                  message={showValidation ? errors.supportNote : undefined}
                />
              </label>
            </div>
          </fieldset>

          <div className="create-ad-form-card__footer">
            <button
              type="button"
              className="create-ad-button create-ad-button--ghost"
              onClick={handleResetDraft}
              disabled={isPublishing}
            >
              <RotateCcw size={16} /> Clear
            </button>
            <div className="create-ad-form-card__actions">
              <button
                type="button"
                className="create-ad-button"
                onClick={handleSaveDraft}
                disabled={isPublishing}
              >
                <Save size={16} /> Save draft
              </button>
              <button
                type="submit"
                className="create-ad-button create-ad-button--primary"
                disabled={isPublishing || kycStatus !== "approved"}
              >
                <Send size={16} />
                {isPublishing ? "Submitting…" : "Submit for review"}
              </button>
            </div>
          </div>
        </form>

        {isPreviewOpen ? (
          <div
            className="create-ad-preview-backdrop"
            role="presentation"
            onMouseDown={(event) => {
              if (event.target === event.currentTarget) {
                setIsPreviewOpen(false);
              }
            }}
          >
            <section
              className="card create-ad-preview-card create-ad-preview-dialog"
              role="dialog"
              aria-modal="true"
              aria-labelledby="create-ad-preview-title"
            >
              <div className="create-ad-preview-card__top">
                <div>
                  <p className="create-ad-section-kicker">Borrower view</p>
                  <h2 className="section-title" id="create-ad-preview-title">
                    Advertisement preview
                  </h2>
                </div>
                <div className="create-ad-preview-card__actions">
                  <span className="create-ad-draft-badge">Draft</span>
                  <button
                    type="button"
                    className="create-ad-preview-close"
                    onClick={() => setIsPreviewOpen(false)}
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
                      {session.displayName}
                    </p>
                    <p className="create-ad-preview__meta">
                      <BadgeCheck size={14} />
                      {kycStatus === "approved"
                        ? "Verified lender"
                        : "KYC approval pending"}
                    </p>
                  </div>
                </div>
                <div>
                  <p className="create-ad-preview__audience">
                    {draft.borrowerFocus || "Intended borrower group"}
                  </p>
                  <h3 className="create-ad-preview__title">
                    {draft.headline || "Your advertisement title"}
                  </h3>
                </div>
                <article className="create-ad-preview__amount">
                  <span>Available amount</span>
                  <strong>{amountRange}</strong>
                </article>
                <div className="create-ad-preview__metrics">
                  <article className="create-ad-preview__metric">
                    <span>Annual rate</span>
                    <strong>
                      {draft.interestRate
                        ? `${draft.interestRate}%`
                        : "Not set"}
                    </strong>
                  </article>
                  <article className="create-ad-preview__metric">
                    <span>Maximum term</span>
                    <strong>
                      {draft.tenureMonths
                        ? `${draft.tenureMonths} months`
                        : "Not set"}
                    </strong>
                  </article>
                  <article className="create-ad-preview__metric">
                    <span>Review time</span>
                    <strong>
                      {draft.processingTime.replace("Within ", "")}
                    </strong>
                  </article>
                </div>
                <p className="create-ad-preview__description">
                  {draft.supportNote ||
                    "Your offer description will appear here."}
                </p>
                <div className="create-ad-preview__requirements">
                  <Check size={16} aria-hidden="true" />
                  <div>
                    <strong>What borrowers need</strong>
                    <p>
                      {draft.requirements ||
                        "Eligibility and document requirements"}
                    </p>
                  </div>
                </div>
                <div className="create-ad-preview__footer">
                  <span>Monthly repayments</span>
                  <button type="button" disabled>
                    View offer
                  </button>
                </div>
              </div>
            </section>
          </div>
        ) : null}
      </section>
    </section>
  );
}
