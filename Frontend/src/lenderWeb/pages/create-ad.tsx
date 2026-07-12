import { useEffect, useState } from 'react'
import { RotateCcw, Save, Send } from 'lucide-react'
import type { LenderSession } from '../lib/lender-session'
import {
  createLenderAd,
  fetchLenderAds,
  type LenderAd,
} from '../lib/lender-ads-api'

type CreateAdPageProps = {
  session: LenderSession
}

type AdDraft = {
  headline: string
  minAmount: string
  maxAmount: string
  interestRate: string
  tenureMonths: string
  borrowerFocus: string
  processingTime: string
  repaymentStyle: string
  requirements: string
  supportNote: string
}

const DEFAULT_DRAFT: AdDraft = {
  headline: 'Working capital loans',
  minAmount: '50000',
  maxAmount: '250000',
  interestRate: '14.5',
  tenureMonths: '12',
  borrowerFocus: 'Small business owners',
  processingTime: 'Within 24 hours',
  repaymentStyle: 'Monthly installments',
  requirements: 'NIC, bank statements, and income proof.',
  supportNote: 'Transparent rates and a clear approval process.',
}

function getStorageKey(lenderId: string): string {
  return `smart-credit:create-ad-draft:${lenderId}`
}

function parseStoredDraft(value: string | null): AdDraft | null {
  if (!value) {
    return null
  }

  try {
    const parsed = JSON.parse(value) as Partial<AdDraft>

    if (!parsed || typeof parsed !== 'object') {
      return null
    }

    return {
      headline:
        typeof parsed.headline === 'string'
          ? parsed.headline
          : DEFAULT_DRAFT.headline,
      minAmount:
        typeof parsed.minAmount === 'string'
          ? parsed.minAmount
          : DEFAULT_DRAFT.minAmount,
      maxAmount:
        typeof parsed.maxAmount === 'string'
          ? parsed.maxAmount
          : DEFAULT_DRAFT.maxAmount,
      interestRate:
        typeof parsed.interestRate === 'string'
          ? parsed.interestRate
          : DEFAULT_DRAFT.interestRate,
      tenureMonths:
        typeof parsed.tenureMonths === 'string'
          ? parsed.tenureMonths
          : DEFAULT_DRAFT.tenureMonths,
      borrowerFocus:
        typeof parsed.borrowerFocus === 'string'
          ? parsed.borrowerFocus
          : DEFAULT_DRAFT.borrowerFocus,
      processingTime:
        typeof parsed.processingTime === 'string'
          ? parsed.processingTime
          : DEFAULT_DRAFT.processingTime,
      repaymentStyle:
        typeof parsed.repaymentStyle === 'string'
          ? parsed.repaymentStyle
          : DEFAULT_DRAFT.repaymentStyle,
      requirements:
        typeof parsed.requirements === 'string'
          ? parsed.requirements
          : DEFAULT_DRAFT.requirements,
      supportNote:
        typeof parsed.supportNote === 'string'
          ? parsed.supportNote
          : DEFAULT_DRAFT.supportNote,
    }
  } catch {
    return null
  }
}

function formatCurrency(value: string): string {
  const amount = Number(value)

  if (!Number.isFinite(amount) || amount <= 0) {
    return 'LKR 0'
  }

  return new Intl.NumberFormat('en-LK', {
    style: 'currency',
    currency: 'LKR',
    maximumFractionDigits: 0,
  }).format(amount)
}

function formatShortDate(value: string | null): string {
  if (!value) {
    return 'No date'
  }

  const parsed = new Date(value)

  if (Number.isNaN(parsed.getTime())) {
    return 'No date'
  }

  return new Intl.DateTimeFormat('en-LK', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  }).format(parsed)
}

function buildOfferSummary(draft: AdDraft): string {
  return `${draft.processingTime}. ${draft.repaymentStyle}. ${draft.supportNote}`
}

export default function CreateAdPage({ session }: CreateAdPageProps) {
  const [draft, setDraft] = useState<AdDraft>(
    () =>
      parseStoredDraft(window.localStorage.getItem(getStorageKey(session.lenderId))) ??
      DEFAULT_DRAFT,
  )
  const [saveMessage, setSaveMessage] = useState<string | null>(null)
  const [publishMessage, setPublishMessage] = useState<string | null>(null)
  const [publishError, setPublishError] = useState<string | null>(null)
  const [isPublishing, setIsPublishing] = useState(false)
  const [recentAds, setRecentAds] = useState<LenderAd[]>([])
  const [isRecentAdsLoading, setIsRecentAdsLoading] = useState(true)

  useEffect(() => {
    if (!saveMessage) {
      return
    }

    const timeout = window.setTimeout(() => setSaveMessage(null), 2400)
    return () => window.clearTimeout(timeout)
  }, [saveMessage])

  useEffect(() => {
    if (!publishMessage) {
      return
    }

    const timeout = window.setTimeout(() => setPublishMessage(null), 3200)
    return () => window.clearTimeout(timeout)
  }, [publishMessage])

  useEffect(() => {
    let isMounted = true

    const loadRecentAds = async () => {
      try {
        setIsRecentAdsLoading(true)
        const ads = await fetchLenderAds(session.lenderId, 4)

        if (isMounted) {
          setRecentAds(ads)
        }
      } catch {
        if (isMounted) {
          setRecentAds([])
        }
      } finally {
        if (isMounted) {
          setIsRecentAdsLoading(false)
        }
      }
    }

    void loadRecentAds()

    return () => {
      isMounted = false
    }
  }, [session.lenderId])

  function updateDraft<Key extends keyof AdDraft>(key: Key, value: AdDraft[Key]) {
    setDraft((current) => ({
      ...current,
      [key]: value,
    }))
  }

  function handleSaveDraft() {
    window.localStorage.setItem(getStorageKey(session.lenderId), JSON.stringify(draft))
    setSaveMessage('Draft saved locally for this lender.')
  }

  function handleResetDraft() {
    setDraft(DEFAULT_DRAFT)
    window.localStorage.removeItem(getStorageKey(session.lenderId))
    setSaveMessage('Draft reset to the starter version.')
  }

  async function handlePublishAd() {
    try {
      setIsPublishing(true)
      setPublishError(null)
      setPublishMessage(null)

      const createdAd = await createLenderAd({
        lenderId: session.lenderId,
        lenderName: session.displayName,
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
      })

      window.localStorage.setItem(getStorageKey(session.lenderId), JSON.stringify(draft))
      setRecentAds((current) =>
        [createdAd, ...current.filter((ad) => ad.id !== createdAd.id)].slice(0, 4),
      )
      setPublishMessage(`Ad published successfully as ${createdAd.id}.`)
    } catch (error) {
      setPublishError(
        error instanceof Error ? error.message : 'Failed to publish lender ad.',
      )
    } finally {
      setIsPublishing(false)
    }
  }

  const amountRange = `${formatCurrency(draft.minAmount)} - ${formatCurrency(draft.maxAmount)}`
  const previewStatus = recentAds[0]?.status ?? 'preview only'
  return (
    <section className="dashboard-panel">
      <header className="page-header">
        <div>
          <h1 className="page-title">Create Ad</h1>
          <p className="page-subtitle">Create a lending offer for borrower review.</p>
        </div>
      </header>

      <section className="create-ad-layout">
        <article className="card create-ad-form-card">
          <div className="create-ad-form-card__header">
            <div>
              <h2 className="section-title">Offer Details</h2>
            </div>
          </div>

          {saveMessage ? <p className="create-ad-banner">{saveMessage}</p> : null}
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
              <span className="create-ad-field__label">Title</span>
              <input
                className="input"
                type="text"
                value={draft.headline}
                onChange={(event) => updateDraft('headline', event.target.value)}
                placeholder="Working capital loans"
              />
            </label>

            <label className="create-ad-field">
              <span className="create-ad-field__label">Minimum amount</span>
              <input
                className="input"
                type="number"
                min="0"
                value={draft.minAmount}
                onChange={(event) => updateDraft('minAmount', event.target.value)}
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
                onChange={(event) => updateDraft('maxAmount', event.target.value)}
                placeholder="250000"
              />
            </label>

            <label className="create-ad-field">
              <span className="create-ad-field__label">Annual interest (%)</span>
              <input
                className="input"
                type="number"
                min="0"
                step="0.1"
                value={draft.interestRate}
                onChange={(event) => updateDraft('interestRate', event.target.value)}
                placeholder="14.5"
              />
            </label>

            <label className="create-ad-field">
              <span className="create-ad-field__label">Maximum tenure (months)</span>
              <input
                className="input"
                type="number"
                min="1"
                value={draft.tenureMonths}
                onChange={(event) => updateDraft('tenureMonths', event.target.value)}
                placeholder="12"
              />
            </label>

            <label className="create-ad-field create-ad-field--full">
              <span className="create-ad-field__label">Target borrowers</span>
              <input
                className="input"
                type="text"
                value={draft.borrowerFocus}
                onChange={(event) => updateDraft('borrowerFocus', event.target.value)}
                placeholder="Who should apply for this offer?"
              />
            </label>

            <label className="create-ad-field">
              <span className="create-ad-field__label">Review time</span>
              <select
                className="input"
                value={draft.processingTime}
                onChange={(event) => updateDraft('processingTime', event.target.value)}
              >
                <option value="Within 24 hours">Within 24 hours</option>
                <option value="Within 2 business days">Within 2 business days</option>
                <option value="Within 3 business days">Within 3 business days</option>
              </select>
            </label>

            <label className="create-ad-field">
              <span className="create-ad-field__label">Repayment</span>
              <select
                className="input"
                value={draft.repaymentStyle}
                onChange={(event) => updateDraft('repaymentStyle', event.target.value)}
              >
                <option value="Monthly installments">Monthly installments</option>
              </select>
            </label>

            <label className="create-ad-field create-ad-field--full">
              <span className="create-ad-field__label">Requirements</span>
              <textarea
                className="create-ad-textarea"
                value={draft.requirements}
                onChange={(event) => updateDraft('requirements', event.target.value)}
                rows={3}
                placeholder="NIC, bank statements, and income proof"
              />
            </label>

            <label className="create-ad-field create-ad-field--full">
              <span className="create-ad-field__label">Description</span>
              <textarea
                className="create-ad-textarea"
                value={draft.supportNote}
                onChange={(event) => updateDraft('supportNote', event.target.value)}
                rows={3}
                placeholder="Short description shown to borrowers"
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
                <RotateCcw size={16} /> Reset
              </button>
              <button
                type="button"
                className="create-ad-button"
                onClick={handleSaveDraft}
                disabled={isPublishing}
              >
                <Save size={16} /> Save
              </button>
              <button
                type="button"
                className="create-ad-button create-ad-button--primary"
                onClick={handlePublishAd}
                disabled={isPublishing}
              >
                <Send size={16} /> {isPublishing ? 'Publishing...' : 'Publish'}
              </button>
            </div>
          </div>
        </article>

        <aside className="create-ad-preview-column">
          <article className="card create-ad-preview-card">
            <div className="create-ad-preview-card__top">
              <div>
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
                  <p className="create-ad-preview__name">{session.displayName}</p>
                  <p className="create-ad-preview__meta">Verified lender</p>
                </div>
              </div>

              <h3 className="create-ad-preview__title">
                {draft.headline || 'Your lending headline will appear here'}
              </h3>

              <div className="create-ad-preview__metrics">
                <article className="create-ad-preview__metric">
                  <span>Amount Range</span>
                  <strong>{amountRange}</strong>
                </article>
                <article className="create-ad-preview__metric">
                  <span>Interest Rate</span>
                  <strong>{draft.interestRate || '0'}%</strong>
                </article>
                <article className="create-ad-preview__metric">
                  <span>Tenure</span>
                  <strong>{draft.tenureMonths || '0'} months</strong>
                </article>
              </div>

              <div className="create-ad-preview__section">
                <p className="create-ad-preview__label">Best for</p>
                <p>
                  {draft.borrowerFocus ||
                    'Target borrower group'}
                </p>
              </div>

              <div className="create-ad-preview__section">
                <p className="create-ad-preview__label">Terms</p>
                <p>{buildOfferSummary(draft)}</p>
              </div>

              <div className="create-ad-preview__section">
                <p className="create-ad-preview__label">Requirements</p>
                <p>
                  {draft.requirements ||
                    'Explain the documents and checks clearly.'}
                </p>
              </div>
            </div>
          </article>

          <article className="card create-ad-tips-card">
            <h2 className="section-title">Recent Ads</h2>
            <div className="create-ad-tips-card__list">
              {isRecentAdsLoading ? (
                <article className="create-ad-tip">
                  <p>Loading lender ads...</p>
                </article>
              ) : recentAds.length > 0 ? (
                recentAds.map((ad) => (
                  <article className="create-ad-tip" key={ad.id}>
                    <strong>{ad.title}</strong>
                    <p>
                      {formatCurrency(String(ad.minAmount))} -{' '}
                      {formatCurrency(String(ad.maxAmount))} |{' '}
                      {ad.preferredInterestRate}%
                    </p>
                    <p>
                      {ad.maxTenureMonths} months | {ad.status} |{' '}
                      {formatShortDate(ad.createdAt)}
                    </p>
                  </article>
                ))
              ) : (
                <article className="create-ad-tip">
                  <strong>No ads yet</strong>
                </article>
              )}
            </div>
          </article>
        </aside>
      </section>
    </section>
  )
}
