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
import {
  focusFirstInvalidField,
  getApiFieldErrors,
  numberError,
  requiredText,
} from "../../lib/validation";

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

  errors.headline = requiredText(draft.headline, "Title", {
    min: 12,
    max: 160,
  });
  errors.minAmount = numberError(draft.minAmount, "Minimum amount", {
    min: 10_000,
    max: 5_000_000,
    maxDecimals: 2,
  });
  errors.maxAmount = numberError(draft.maxAmount, "Maximum amount", {
    min: 10_000,
    max: 5_000_000,
    maxDecimals: 2,
  });
  if (
    !errors.maxAmount &&
    Number.isFinite(minAmount) &&
    maxAmount < minAmount
  ) {
    errors.maxAmount = "Must be equal to or above the minimum.";
  }
  errors.interestRate = numberError(
    draft.interestRate,
    "Annual interest rate",
    {
      min: 0.01,
      max: 100,
      maxDecimals: 2,
    },
  );
  errors.tenureMonths = numberError(draft.tenureMonths, "Maximum tenure", {
    min: 3,
    max: 60,
    integer: true,
  });
  errors.borrowerFocus = requiredText(
    draft.borrowerFocus,
    "Intended borrowers",
    { min: 8, max: 240 },
  );
  errors.processingTime = requiredText(
    draft.processingTime,
    "Expected review time",
    { min: 6, max: 100 },
  );
  errors.repaymentStyle = requiredText(
    draft.repaymentStyle,
    "Repayment style",
    { min: 6, max: 100 },
  );
  errors.requirements = requiredText(
    draft.requirements,
    "Eligibility and documents",
    { min: 12, max: 1000 },
  );
  errors.supportNote = requiredText(draft.supportNote, "Description", {
    min: 12,
    max: 2000,
  });

  return Object.fromEntries(
    Object.entries(errors).filter(([, message]) => Boolean(message)),
  ) as DraftErrors;
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

function FieldError({
  message,
  field,
}: {
  message?: string;
  field: keyof AdDraft;
}) {
  return message ? (
    <span className="create-ad-field__error" id={`create-ad-error-${field}`}>
      {message}
    </span>
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
  const [touchedFields, setTouchedFields] = useState<Set<keyof AdDraft>>(
    () => new Set(),
  );
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
      focusFirstInvalidField(errors);
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
      const backendErrors = getApiFieldErrors(error);
      if (Object.keys(backendErrors).length) {
        setShowValidation(true);
        focusFirstInvalidField(backendErrors);
      }
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
    (showValidation || touchedFields.has(key)) && Boolean(errors[key]);
  const visibleError = (key: keyof AdDraft) =>
    showValidation || touchedFields.has(key) ? errors[key] : undefined;

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
          onBlurCapture={(event) => {
            const key = (event.target as HTMLElement).dataset
              .validationField as keyof AdDraft | undefined;
            if (key) setTouchedFields((current) => new Set(current).add(key));
          }}
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
            <p
              className="create-ad-banner create-ad-banner--error"
              role="status"
            >
              Advertisement submission is locked until your lender KYC is
              approved. Current status: {kycStatus.replace(/_/g, " ")}.
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
                  data-validation-field="headline"
                  aria-invalid={inputError("headline")}
                  aria-describedby={
                    inputError("headline")
                      ? "create-ad-error-headline"
                      : undefined
                  }
                />
                <FieldError
                  field="headline"
                  message={visibleError("headline")}
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
                  data-validation-field="borrowerFocus"
                  aria-invalid={inputError("borrowerFocus")}
                  aria-describedby={
                    inputError("borrowerFocus")
                      ? "create-ad-error-borrowerFocus"
                      : undefined
                  }
                />
                <FieldError
                  field="borrowerFocus"
                  message={visibleError("borrowerFocus")}
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
                  min="10000"
                  max="5000000"
                  step="0.01"
                  data-validation-field="minAmount"
                  value={draft.minAmount}
                  onChange={(event) =>
                    updateDraft("minAmount", event.target.value)
                  }
                  placeholder="50000"
                  aria-invalid={inputError("minAmount")}
                  aria-describedby={
                    inputError("minAmount")
                      ? "create-ad-error-minAmount"
                      : undefined
                  }
                />
                <FieldError
                  field="minAmount"
                  message={visibleError("minAmount")}
                />
              </label>
              <label className="create-ad-field">
                <span className="create-ad-field__label">
                  Maximum amount (LKR) *
                </span>
                <input
                  className="input"
                  type="number"
                  min="10000"
                  max="5000000"
                  step="0.01"
                  data-validation-field="maxAmount"
                  value={draft.maxAmount}
                  onChange={(event) =>
                    updateDraft("maxAmount", event.target.value)
                  }
                  placeholder="250000"
                  aria-invalid={inputError("maxAmount")}
                  aria-describedby={
                    inputError("maxAmount")
                      ? "create-ad-error-maxAmount"
                      : undefined
                  }
                />
                <FieldError
                  field="maxAmount"
                  message={visibleError("maxAmount")}
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
                  data-validation-field="interestRate"
                  value={draft.interestRate}
                  onChange={(event) =>
                    updateDraft("interestRate", event.target.value)
                  }
                  placeholder="14.5"
                  aria-invalid={inputError("interestRate")}
                  aria-describedby={
                    inputError("interestRate")
                      ? "create-ad-error-interestRate"
                      : undefined
                  }
                />
                <FieldError
                  field="interestRate"
                  message={visibleError("interestRate")}
                />
              </label>
              <label className="create-ad-field">
                <span className="create-ad-field__label">
                  Maximum tenure (months) *
                </span>
                <input
                  className="input"
                  type="number"
                  min="3"
                  max="60"
                  step="1"
                  data-validation-field="tenureMonths"
                  value={draft.tenureMonths}
                  onChange={(event) =>
                    updateDraft("tenureMonths", event.target.value)
                  }
                  placeholder="12"
                  aria-invalid={inputError("tenureMonths")}
                  aria-describedby={
                    inputError("tenureMonths")
                      ? "create-ad-error-tenureMonths"
                      : undefined
                  }
                />
                <FieldError
                  field="tenureMonths"
                  message={visibleError("tenureMonths")}
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
                  data-validation-field="processingTime"
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
                  data-validation-field="requirements"
                  aria-invalid={inputError("requirements")}
                  aria-describedby={
                    inputError("requirements")
                      ? "create-ad-error-requirements"
                      : undefined
                  }
                />
                <FieldError
                  field="requirements"
                  message={visibleError("requirements")}
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
                  data-validation-field="supportNote"
                  aria-invalid={inputError("supportNote")}
                  aria-describedby={
                    inputError("supportNote")
                      ? "create-ad-error-supportNote"
                      : undefined
                  }
                />
                <FieldError
                  field="supportNote"
                  message={visibleError("supportNote")}
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
