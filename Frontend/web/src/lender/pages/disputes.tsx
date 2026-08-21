import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  Archive,
  CheckCircle2,
  ChevronRight,
  FileText,
  MessageSquareText,
  Paperclip,
  Plus,
  RefreshCw,
  Search,
  Send,
  ShieldAlert,
  Upload,
  UserRound,
  X,
} from "lucide-react";
import type { LenderSession } from "../lib/lender-session";
import {
  disputeApi,
  subscribeToDisputes,
  uploadDisputeEvidence,
  type Dispute,
  type DisputeCategory,
  type DisputeEvent,
  type DisputeListScope,
  type EligibleLoan,
  type TimestampValue,
} from "../lib/disputes-api";

const CATEGORY_OPTIONS: Array<{ value: DisputeCategory; label: string }> = [
  { value: "payment", label: "Payment or collection" },
  { value: "loan_terms", label: "Loan terms" },
  { value: "fraud", label: "Suspected fraud" },
  { value: "conduct", label: "Borrower conduct" },
  { value: "other", label: "Other" },
];

const currencyFormatter = new Intl.NumberFormat("en-LK", {
  style: "currency",
  currency: "LKR",
  maximumFractionDigits: 0,
});

function timestampMillis(value?: TimestampValue | null): number {
  return (value?._seconds ?? 0) * 1000;
}

function formatDate(value?: TimestampValue | null): string {
  const millis = timestampMillis(value);
  if (!millis) return "Not available";
  return new Intl.DateTimeFormat("en-LK", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(millis));
}

function formatLabel(value: string): string {
  return value
    .replaceAll("_", " ")
    .replace(/\b\w/g, (character) => character.toUpperCase());
}

function statusTone(status: Dispute["status"]): string {
  if (status === "resolved" || status === "closed") return "success";
  if (status === "escalated") return "danger";
  if (status === "awaiting_response") return "warning";
  return "info";
}

function priorityTone(priority: string): string {
  if (priority === "critical" || priority === "high") return "danger";
  if (priority === "medium") return "warning";
  return "neutral";
}

function loanLabel(loan: EligibleLoan): string {
  const name = loan.borrowerName || "Borrower";
  const amount =
    typeof loan.principalAmountMinor === "number"
      ? currencyFormatter.format(loan.principalAmountMinor / 100)
      : null;
  return [name, amount, formatLabel(loan.status)].filter(Boolean).join(" · ");
}

export default function LenderDisputesPage({
  session,
}: {
  session: LenderSession;
}) {
  const [scope, setScope] = useState<DisputeListScope>("active");
  const [items, setItems] = useState<Dispute[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [selected, setSelected] = useState<Dispute | null>(null);
  const [events, setEvents] = useState<DisputeEvent[]>([]);
  const [loans, setLoans] = useState<EligibleLoan[]>([]);
  const [search, setSearch] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [isTimelineLoading, setIsTimelineLoading] = useState(false);
  const [error, setError] = useState("");
  const [actionError, setActionError] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [showReopen, setShowReopen] = useState(false);
  const [loanId, setLoanId] = useState("");
  const [category, setCategory] = useState<DisputeCategory>("payment");
  const [subject, setSubject] = useState("");
  const [description, setDescription] = useState("");
  const [desiredOutcome, setDesiredOutcome] = useState("");
  const [evidence, setEvidence] = useState<File[]>([]);
  const [message, setMessage] = useState("");
  const [messageEvidence, setMessageEvidence] = useState<File[]>([]);
  const [reopenReason, setReopenReason] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const loadCases = useCallback(
    async (append = false) => {
      try {
        append ? setIsLoadingMore(true) : setIsLoading(true);
        const response = await disputeApi.list(
          scope,
          append ? nextCursor : null,
        );
        setItems((current) =>
          append
            ? [
                ...current,
                ...response.disputes.filter(
                  (next) => !current.some((item) => item.id === next.id),
                ),
              ]
            : response.disputes,
        );
        setNextCursor(response.nextCursor ?? null);
        setSelected((current) => {
          if (!current) return null;
          const updated = response.disputes.find(
            (item) => item.id === current.id,
          );
          return updated ?? (append ? current : null);
        });
        setError("");
      } catch (reason) {
        setError(
          reason instanceof Error ? reason.message : "Failed to load disputes.",
        );
      } finally {
        setIsLoading(false);
        setIsLoadingMore(false);
      }
    },
    [nextCursor, scope],
  );

  useEffect(() => {
    void disputeApi
      .loans()
      .then((response) => setLoans(response.loans))
      .catch((reason) =>
        setError(
          reason instanceof Error
            ? reason.message
            : "Failed to load eligible loans.",
        ),
      );
  }, []);

  useEffect(() => {
    setSelected(null);
    setNextCursor(null);
    void loadCases(false);
  }, [scope]);

  useEffect(
    () => subscribeToDisputes(session.accessToken, () => void loadCases(false)),
    [loadCases, session.accessToken],
  );

  const loadTimeline = useCallback(async (disputeId: string) => {
    try {
      setIsTimelineLoading(true);
      setActionError("");
      const response = await disputeApi.events(disputeId);
      setEvents(response.events);
    } catch (reason) {
      setActionError(
        reason instanceof Error
          ? reason.message
          : "Failed to load the dispute timeline.",
      );
    } finally {
      setIsTimelineLoading(false);
    }
  }, []);

  useEffect(() => {
    setEvents([]);
    setShowReopen(false);
    setReopenReason("");
    if (selected) void loadTimeline(selected.id);
  }, [loadTimeline, selected?.id]);

  const visibleItems = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return items;
    return items.filter((item) =>
      [
        item.subject,
        item.disputeCode,
        item.borrowerName,
        item.category,
        item.status,
      ].some((value) =>
        String(value ?? "")
          .toLowerCase()
          .includes(query),
      ),
    );
  }, [items, search]);

  function resetCreateForm() {
    setLoanId("");
    setCategory("payment");
    setSubject("");
    setDescription("");
    setDesiredOutcome("");
    setEvidence([]);
  }

  async function createCase(event: React.FormEvent) {
    event.preventDefault();
    try {
      setSubmitting(true);
      setActionError("");
      const evidenceDocumentIds = await Promise.all(
        evidence.slice(0, 5).map((file) => uploadDisputeEvidence(file, loanId)),
      );
      const response = await disputeApi.create({
        loanId,
        category,
        subject,
        description,
        desiredOutcome,
        evidenceDocumentIds,
      });
      resetCreateForm();
      setShowCreate(false);
      setScope("active");
      setItems((current) => [
        response.dispute,
        ...current.filter((item) => item.id !== response.dispute.id),
      ]);
      setSelected(response.dispute);
      await loadTimeline(response.dispute.id);
    } catch (reason) {
      setActionError(
        reason instanceof Error ? reason.message : "Failed to create dispute.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  async function addMessage() {
    if (!selected || !message.trim()) return;
    try {
      setSubmitting(true);
      setActionError("");
      const documentIds = await Promise.all(
        messageEvidence
          .slice(0, 5)
          .map((file) => uploadDisputeEvidence(file, selected.loanId)),
      );
      await disputeApi.comment(selected.id, message.trim(), documentIds);
      setMessage("");
      setMessageEvidence([]);
      await Promise.all([loadTimeline(selected.id), loadCases(false)]);
    } catch (reason) {
      setActionError(
        reason instanceof Error ? reason.message : "Failed to send message.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  async function acknowledgeResolution() {
    if (!selected) return;
    try {
      setSubmitting(true);
      setActionError("");
      const response = await disputeApi.acknowledge(selected.id);
      setSelected(response.dispute);
      await Promise.all([loadTimeline(selected.id), loadCases(false)]);
    } catch (reason) {
      setActionError(
        reason instanceof Error
          ? reason.message
          : "Failed to acknowledge resolution.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  async function reopenCase() {
    if (!selected || reopenReason.trim().length < 5) return;
    try {
      setSubmitting(true);
      setActionError("");
      const response = await disputeApi.reopen(
        selected.id,
        reopenReason.trim(),
      );
      setShowReopen(false);
      setReopenReason("");
      setScope("active");
      setSelected(response.dispute);
    } catch (reason) {
      setActionError(
        reason instanceof Error ? reason.message : "Failed to reopen dispute.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  async function openEvidence(documentId: string) {
    try {
      setActionError("");
      const response = await disputeApi.evidenceAccess(documentId);
      window.open(response.accessUrl, "_blank", "noopener,noreferrer");
    } catch (reason) {
      setActionError(
        reason instanceof Error ? reason.message : "Evidence is unavailable.",
      );
    }
  }

  const lenderAcknowledged = Boolean(
    selected?.acknowledgements?.[session.lenderId],
  );

  return (
    <section className="dashboard-panel lender-disputes">
      <header className="page-header lender-disputes__header">
        <div>
          <p className="eyebrow">Case management</p>
          <h1 className="page-title">Disputes</h1>
          <p className="page-subtitle">
            Raise an issue, share evidence, and follow the admin resolution from
            one workspace.
          </p>
        </div>
        <button
          type="button"
          className="dispute-button dispute-button--primary"
          onClick={() => {
            setActionError("");
            setShowCreate(true);
          }}
        >
          <Plus size={17} /> New dispute
        </button>
      </header>

      {error ? (
        <div className="dispute-alert dispute-alert--error" role="alert">
          <AlertTriangle size={18} />
          <span>{error}</span>
          <button type="button" onClick={() => void loadCases(false)}>
            Retry
          </button>
        </div>
      ) : null}

      <div className="dispute-toolbar">
        <div className="dispute-tabs" aria-label="Dispute views">
          <button
            type="button"
            className={scope === "active" ? "is-active" : ""}
            aria-pressed={scope === "active"}
            onClick={() => setScope("active")}
          >
            <ShieldAlert size={17} /> Active disputes
          </button>
          <button
            type="button"
            className={scope === "history" ? "is-active" : ""}
            aria-pressed={scope === "history"}
            onClick={() => setScope("history")}
          >
            <Archive size={17} /> Previous disputes
          </button>
        </div>
        <label className="dispute-search">
          <Search size={17} aria-hidden="true" />
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search cases"
            aria-label="Search disputes"
          />
        </label>
        <button
          type="button"
          className="dispute-icon-button"
          aria-label="Refresh disputes"
          title="Refresh"
          onClick={() => void loadCases(false)}
          disabled={isLoading}
        >
          <RefreshCw size={17} />
        </button>
      </div>

      <div className="dispute-workspace">
        <section className="dispute-list-panel" aria-label="Dispute list">
          <div className="dispute-list-panel__heading">
            <div>
              <h2>{scope === "active" ? "Current cases" : "Case history"}</h2>
              <p>{items.length} loaded</p>
            </div>
          </div>

          {isLoading ? (
            <div className="dispute-empty-state">
              <RefreshCw className="dispute-spin" size={22} />
              <p>Loading disputes...</p>
            </div>
          ) : visibleItems.length ? (
            <div className="dispute-case-list">
              {visibleItems.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  className={`dispute-case-card${
                    selected?.id === item.id ? " is-selected" : ""
                  }`}
                  onClick={() => setSelected(item)}
                >
                  <div className="dispute-case-card__topline">
                    <span
                      className={`dispute-status dispute-status--${statusTone(
                        item.status,
                      )}`}
                    >
                      {formatLabel(item.status)}
                    </span>
                    <span
                      className={`dispute-priority dispute-priority--${priorityTone(
                        item.priority,
                      )}`}
                    >
                      {formatLabel(item.priority)}
                    </span>
                  </div>
                  <strong>{item.subject}</strong>
                  <p>
                    <UserRound size={14} />
                    {item.borrowerName || "Borrower"}
                  </p>
                  <div className="dispute-case-card__footer">
                    <span>{item.disputeCode}</span>
                    <span>{formatDate(item.updatedAt)}</span>
                    <ChevronRight size={17} />
                  </div>
                </button>
              ))}
            </div>
          ) : (
            <div className="dispute-empty-state">
              {scope === "active" ? (
                <CheckCircle2 size={28} />
              ) : (
                <Archive size={28} />
              )}
              <h3>{search ? "No matching disputes" : "No disputes here"}</h3>
              <p>
                {search
                  ? "Try another case reference, borrower, or subject."
                  : scope === "active"
                    ? "You have no active disputes requiring attention."
                    : "Resolved and closed disputes will appear here."}
              </p>
            </div>
          )}

          {nextCursor ? (
            <button
              type="button"
              className="dispute-button dispute-button--secondary dispute-load-more"
              disabled={isLoadingMore}
              onClick={() => void loadCases(true)}
            >
              {isLoadingMore ? "Loading..." : "Load more cases"}
            </button>
          ) : null}
        </section>

        <section className="dispute-detail-panel" aria-live="polite">
          {selected ? (
            <>
              <header className="dispute-detail__header">
                <div>
                  <div className="dispute-detail__reference">
                    {selected.disputeCode}
                  </div>
                  <h2>{selected.subject}</h2>
                  <p>{selected.borrowerName || "Borrower case"}</p>
                </div>
                <button
                  type="button"
                  className="dispute-icon-button dispute-detail__close"
                  aria-label="Close dispute details"
                  onClick={() => setSelected(null)}
                >
                  <X size={18} />
                </button>
              </header>

              <div className="dispute-detail__facts">
                <div>
                  <span>Status</span>
                  <strong>{formatLabel(selected.status)}</strong>
                </div>
                <div>
                  <span>Category</span>
                  <strong>{formatLabel(selected.category)}</strong>
                </div>
                <div>
                  <span>Priority</span>
                  <strong>{formatLabel(selected.priority)}</strong>
                </div>
                <div>
                  <span>Last update</span>
                  <strong>{formatDate(selected.updatedAt)}</strong>
                </div>
              </div>

              {actionError ? (
                <div
                  className="dispute-alert dispute-alert--error"
                  role="alert"
                >
                  <AlertTriangle size={17} /> {actionError}
                </div>
              ) : null}

              <div className="dispute-detail__section">
                <h3>Issue summary</h3>
                <p>{selected.description}</p>
                <div className="dispute-outcome">
                  <strong>Requested outcome</strong>
                  <p>{selected.desiredOutcome}</p>
                </div>
              </div>

              {selected.evidenceDocumentIds.length ? (
                <div className="dispute-detail__section">
                  <h3>Evidence</h3>
                  <div className="dispute-evidence-list">
                    {selected.evidenceDocumentIds.map((documentId, index) => (
                      <button
                        key={documentId}
                        type="button"
                        onClick={() => void openEvidence(documentId)}
                      >
                        <FileText size={16} /> Evidence file {index + 1}
                      </button>
                    ))}
                  </div>
                </div>
              ) : null}

              {selected.resolution ? (
                <div className="dispute-resolution">
                  <div className="dispute-resolution__title">
                    <CheckCircle2 size={19} />
                    <strong>Admin resolution</strong>
                  </div>
                  <p>{selected.resolution.summary}</p>
                  {selected.resolution.recommendedActions.length ? (
                    <ul>
                      {selected.resolution.recommendedActions.map((action) => (
                        <li key={action}>{action}</li>
                      ))}
                    </ul>
                  ) : null}
                  {selected.status === "resolved" ? (
                    <div className="dispute-resolution__actions">
                      <button
                        type="button"
                        className="dispute-button dispute-button--primary"
                        onClick={() => void acknowledgeResolution()}
                        disabled={submitting || lenderAcknowledged}
                      >
                        <CheckCircle2 size={16} />
                        {lenderAcknowledged
                          ? "Resolution acknowledged"
                          : "Acknowledge resolution"}
                      </button>
                      <button
                        type="button"
                        className="dispute-button dispute-button--secondary"
                        onClick={() => setShowReopen((current) => !current)}
                        disabled={submitting || selected.reopenCount >= 1}
                      >
                        Reopen case
                      </button>
                    </div>
                  ) : null}
                  {showReopen ? (
                    <div className="dispute-reopen-form">
                      <label htmlFor="dispute-reopen-reason">
                        Explain why the resolution needs another review
                      </label>
                      <textarea
                        id="dispute-reopen-reason"
                        rows={3}
                        value={reopenReason}
                        onChange={(event) =>
                          setReopenReason(event.target.value)
                        }
                      />
                      <button
                        type="button"
                        className="dispute-button dispute-button--primary"
                        disabled={submitting || reopenReason.trim().length < 5}
                        onClick={() => void reopenCase()}
                      >
                        Submit for review
                      </button>
                    </div>
                  ) : null}
                </div>
              ) : null}

              <div className="dispute-detail__section">
                <h3>Case timeline</h3>
                {isTimelineLoading ? (
                  <p className="dispute-muted">Loading timeline...</p>
                ) : events.length ? (
                  <div className="dispute-timeline">
                    {events.map((event) => (
                      <article key={event.id}>
                        <div className="dispute-timeline__marker" />
                        <div>
                          <div className="dispute-timeline__heading">
                            <strong>{formatLabel(event.type)}</strong>
                            <span>{formatDate(event.createdAt)}</span>
                          </div>
                          <p>{event.message}</p>
                          <small>{formatLabel(event.actorRole)}</small>
                          {event.documentIds.length ? (
                            <div className="dispute-evidence-list">
                              {event.documentIds.map((documentId, index) => (
                                <button
                                  key={documentId}
                                  type="button"
                                  onClick={() => void openEvidence(documentId)}
                                >
                                  <Paperclip size={14} /> Attachment {index + 1}
                                </button>
                              ))}
                            </div>
                          ) : null}
                        </div>
                      </article>
                    ))}
                  </div>
                ) : (
                  <p className="dispute-muted">No timeline updates yet.</p>
                )}
              </div>

              {selected.status !== "closed" ? (
                <div className="dispute-composer">
                  <label htmlFor="dispute-message">Add a case message</label>
                  <textarea
                    id="dispute-message"
                    rows={3}
                    value={message}
                    placeholder="Write a clear update for the borrower and admin"
                    onChange={(event) => setMessage(event.target.value)}
                  />
                  <div className="dispute-composer__actions">
                    <label className="dispute-attachment-button">
                      <Paperclip size={16} />
                      {messageEvidence.length
                        ? `${messageEvidence.length} attached`
                        : "Attach evidence"}
                      <input
                        type="file"
                        multiple
                        accept="image/jpeg,image/png,image/webp,application/pdf"
                        onChange={(event) =>
                          setMessageEvidence(
                            Array.from(event.target.files ?? []).slice(0, 5),
                          )
                        }
                      />
                    </label>
                    <button
                      type="button"
                      className="dispute-button dispute-button--primary"
                      disabled={submitting || !message.trim()}
                      onClick={() => void addMessage()}
                    >
                      <Send size={16} /> {submitting ? "Sending..." : "Send"}
                    </button>
                  </div>
                </div>
              ) : null}
            </>
          ) : (
            <div className="dispute-detail-empty">
              <MessageSquareText size={34} />
              <h2>Select a dispute</h2>
              <p>
                Open a case to review its issue, evidence, timeline, and admin
                resolution.
              </p>
            </div>
          )}
        </section>
      </div>

      {showCreate ? (
        <div
          className="dispute-modal-backdrop"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget && !submitting)
              setShowCreate(false);
          }}
        >
          <form
            className="dispute-modal"
            onSubmit={(event) => void createCase(event)}
          >
            <header>
              <div>
                <span>New case</span>
                <h2>Raise a dispute</h2>
                <p>Give the admin enough information to review the issue.</p>
              </div>
              <button
                type="button"
                className="dispute-icon-button"
                aria-label="Close new dispute form"
                disabled={submitting}
                onClick={() => setShowCreate(false)}
              >
                <X size={18} />
              </button>
            </header>
            {actionError ? (
              <div className="dispute-alert dispute-alert--error" role="alert">
                <AlertTriangle size={17} /> {actionError}
              </div>
            ) : null}
            <div className="dispute-form-grid">
              <label className="dispute-field dispute-field--wide">
                <span>Loan</span>
                <select
                  required
                  value={loanId}
                  onChange={(event) => setLoanId(event.target.value)}
                >
                  <option value="">Select the related loan</option>
                  {loans.map((loan) => (
                    <option key={loan.id} value={loan.id}>
                      {loanLabel(loan)}
                    </option>
                  ))}
                </select>
              </label>
              <label className="dispute-field dispute-field--wide">
                <span>Issue type</span>
                <select
                  value={category}
                  onChange={(event) =>
                    setCategory(event.target.value as DisputeCategory)
                  }
                >
                  {CATEGORY_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>
              <label className="dispute-field dispute-field--wide">
                <span>Subject</span>
                <input
                  required
                  minLength={3}
                  maxLength={160}
                  value={subject}
                  placeholder="Briefly describe the issue"
                  onChange={(event) => setSubject(event.target.value)}
                />
              </label>
              <label className="dispute-field dispute-field--wide">
                <span>What happened?</span>
                <textarea
                  required
                  minLength={10}
                  maxLength={4000}
                  rows={4}
                  value={description}
                  placeholder="Include the important dates, amounts, and communication"
                  onChange={(event) => setDescription(event.target.value)}
                />
              </label>
              <label className="dispute-field dispute-field--wide">
                <span>Requested outcome</span>
                <textarea
                  required
                  minLength={3}
                  maxLength={1000}
                  rows={3}
                  value={desiredOutcome}
                  placeholder="Explain what a fair resolution would be"
                  onChange={(event) => setDesiredOutcome(event.target.value)}
                />
              </label>
              <label className="dispute-upload dispute-field--wide">
                <Upload size={20} />
                <span>
                  <strong>Add supporting evidence</strong>
                  <small>Up to five JPG, PNG, WebP, or PDF files</small>
                </span>
                <input
                  type="file"
                  multiple
                  accept="image/jpeg,image/png,image/webp,application/pdf"
                  onChange={(event) =>
                    setEvidence(
                      Array.from(event.target.files ?? []).slice(0, 5),
                    )
                  }
                />
                {evidence.length ? <em>{evidence.length} selected</em> : null}
              </label>
            </div>
            <footer>
              <button
                type="button"
                className="dispute-button dispute-button--secondary"
                disabled={submitting}
                onClick={() => setShowCreate(false)}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="dispute-button dispute-button--primary"
                disabled={submitting}
              >
                <ShieldAlert size={16} />
                {submitting ? "Submitting..." : "Submit dispute"}
              </button>
            </footer>
          </form>
        </div>
      ) : null}
    </section>
  );
}
