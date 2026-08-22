import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  Clock3,
  FileText,
  Flag,
  Eye,
  ExternalLink,
  Inbox,
  LockKeyhole,
  Maximize2,
  MessageSquareText,
  Minimize2,
  RefreshCw,
  Search,
  Send,
  ShieldAlert,
  UserRound,
  X,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import {
  addAdminDisputeComment,
  changeDisputePriority,
  closeDispute,
  getDisputeEvents,
  getDisputeEvidenceAccess,
  getDisputeStats,
  getDisputes,
  requestDisputeInformation,
  resolveCanonicalDispute,
  type AdminDispute,
  type DisputeEvent,
  type DisputePriority,
  type DisputeStatus,
} from "../../lib/api";
import { subscribeToAdminDisputes } from "../../lib/dispute-realtime";
import { formatFirestoreDate } from "../../lib/admin-format";
import { useDebouncedValue } from "../../lib/use-debounced-value";
import {
  toEpochMillis,
  useNewItemHighlights,
} from "../../lib/use-new-item-highlights";
import "./Disputes.css";

const PAGE_SIZE_OPTIONS = [10, 20, 50, 100] as const;
const DISPUTE_STATUS_FILTERS: Array<{
  value: DisputeStatus | "all";
  label: string;
}> = [
  { value: "all", label: "All" },
  { value: "open", label: "Open" },
  { value: "under_review", label: "In review" },
  { value: "awaiting_response", label: "Awaiting" },
  { value: "escalated", label: "Escalated" },
  { value: "resolved", label: "Resolved" },
  { value: "closed", label: "Closed" },
];

type DisputeSummaryCard = {
  label: string;
  count: number;
  tone: "primary" | "warning" | "info" | "danger" | "success";
};

type DisputeRow = {
  id: string;
  disputeCode: string;
  title: string;
  transactionId: string;
  loanId: string;
  raisedBy: string;
  againstUser: string;
  description: string;
  category: string;
  status: DisputeStatus;
  priority: DisputePriority;
  disputedAmount: string;
  evidenceUrls: string[];
  createdAt: string;
  createdAtMs: number;
  updatedAt: string;
  assignedAdminId: string;
  desiredOutcome: string;
  resolution: string;
  escalationReason: string;
  notes: string;
};

function mapDispute(dispute: AdminDispute): DisputeRow {
  return {
    id: dispute.id,
    disputeCode:
      dispute.disputeCode || `DSP-${dispute.id.slice(0, 6).toUpperCase()}`,
    title: dispute.subject || dispute.title || `${dispute.category} dispute`,
    transactionId: dispute.transactionId || "N/A",
    loanId: dispute.loanId || "N/A",
    raisedBy:
      dispute.raisedBy ||
      (dispute.complainantId === dispute.lenderId
        ? dispute.lenderName || dispute.lenderId
        : dispute.borrowerName || dispute.borrowerId) ||
      dispute.complainantId ||
      "Unknown",
    againstUser:
      dispute.againstUser ||
      (dispute.respondentId === dispute.borrowerId
        ? dispute.borrowerName || dispute.borrowerId
        : dispute.lenderName || dispute.lenderId) ||
      dispute.respondentId ||
      "Unknown",
    description:
      dispute.description || dispute.title || "No description provided",
    category: dispute.category,
    status: dispute.status,
    priority: dispute.priority,
    disputedAmount:
      typeof dispute.disputedAmount === "number"
        ? `LKR ${dispute.disputedAmount.toLocaleString()}`
        : "N/A",
    evidenceUrls: dispute.evidenceDocumentIds || dispute.evidenceUrls || [],
    createdAt: formatFirestoreDate(dispute.createdAt),
    createdAtMs: toEpochMillis(dispute.createdAt),
    updatedAt: formatFirestoreDate(dispute.updatedAt ?? dispute.createdAt),
    assignedAdminId:
      dispute.assignedAdminId || dispute.assignedTo || "Unassigned",
    desiredOutcome: dispute.desiredOutcome || "No requested outcome provided",
    resolution: dispute.resolution?.summary || "N/A",
    escalationReason: dispute.escalationReason || "N/A",
    notes: dispute.notes || "N/A",
  };
}

function StatusBadge({ status }: { status: DisputeStatus }) {
  return (
    <span className={`admin-dispute-status admin-dispute-status--${status}`}>
      {formatLabel(status)}
    </span>
  );
}

function PriorityBadge({ priority }: { priority: DisputePriority }) {
  return (
    <span
      className={`admin-dispute-priority admin-dispute-priority--${priority}`}
    >
      {formatLabel(priority)}
    </span>
  );
}

function formatLabel(value: string) {
  return value
    .replaceAll("_", " ")
    .replace(/\b\w/g, (character) => character.toUpperCase());
}

// Builds the dispute summary cards so the queue header stays compact.
function buildDisputeSummaryCards(counts: {
  all: number;
  open: number;
  inProgress: number;
  escalated: number;
  resolved: number;
}): DisputeSummaryCard[] {
  return [
    { label: "All cases", count: counts.all, tone: "primary" },
    { label: "Open", count: counts.open, tone: "warning" },
    { label: "In progress", count: counts.inProgress, tone: "info" },
    { label: "Escalated", count: counts.escalated, tone: "danger" },
    { label: "Resolved", count: counts.resolved, tone: "success" },
  ];
}

function SummaryIcon({ tone }: { tone: DisputeSummaryCard["tone"] }) {
  if (tone === "warning") return <Clock3 size={19} />;
  if (tone === "info") return <MessageSquareText size={19} />;
  if (tone === "danger") return <ShieldAlert size={19} />;
  if (tone === "success") return <CheckCircle2 size={19} />;
  return <Inbox size={19} />;
}

// Renders the admin dispute review queue and resolution workflow.
export default function Disputes() {
  const [disputes, setDisputes] = useState<DisputeRow[]>([]);
  const [selectedDispute, setSelectedDispute] = useState<DisputeRow | null>(
    null,
  );
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebouncedValue(search);
  const [filterStatus, setFilterStatus] = useState<DisputeStatus | "all">(
    "all",
  );
  const [loading, setLoading] = useState(true);
  const [timelineLoading, setTimelineLoading] = useState(false);
  const [evidenceLoadingId, setEvidenceLoadingId] = useState<string | null>(
    null,
  );
  const [evidencePreview, setEvidencePreview] = useState<{
    accessUrl: string;
    fileName: string;
    mimeType: string;
  } | null>(null);
  const [isEvidenceFullscreen, setIsEvidenceFullscreen] = useState(false);
  const [error, setError] = useState("");
  const [globalCounts, setGlobalCounts] = useState<Record<string, number>>({});
  const [events, setEvents] = useState<DisputeEvent[]>([]);
  const [caseMessage, setCaseMessage] = useState("");
  const [messageVisibility, setMessageVisibility] = useState<
    "shared" | "admin"
  >("shared");
  const [resolutionSummary, setResolutionSummary] = useState("");
  const [recommendedActions, setRecommendedActions] = useState("");

  // Pagination state
  const [pageSize, setPageSize] = useState<number>(10);
  const [currentPage, setCurrentPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [nextCursor, setNextCursor] = useState<string | undefined>();
  const [cursorStack, setCursorStack] = useState<string[]>([]);
  const [totalLoaded, setTotalLoaded] = useState(0);

  const loadDisputes = useCallback(
    async (cursor?: string) => {
      setLoading(true);
      try {
        const response = await getDisputes({
          limit: pageSize,
          cursor,
          status: filterStatus === "all" ? undefined : filterStatus,
          search: debouncedSearch.trim() || undefined,
        });
        const mappedDisputes = response.disputes.map(mapDispute);
        setDisputes(mappedDisputes);
        setSelectedDispute((current) => {
          if (!current) return null;
          return (
            mappedDisputes.find((dispute) => dispute.id === current.id) ??
            current
          );
        });
        setHasMore(response.hasMore ?? false);
        setNextCursor(response.nextCursor);
        setTotalLoaded(response.count);
        setError("");
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Failed to load disputes.",
        );
      } finally {
        setLoading(false);
      }
    },
    [debouncedSearch, filterStatus, pageSize],
  );

  useEffect(() => {
    setCurrentPage(1);
    setCursorStack([]);
    void loadDisputes();
  }, [loadDisputes]);

  useEffect(() => {
    const refresh = () => {
      const activeCursor =
        currentPage <= 1 ? undefined : cursorStack[cursorStack.length - 1];
      void loadDisputes(activeCursor);
      void getDisputeStats().then((response) =>
        setGlobalCounts(response.stats),
      );
    };
    void getDisputeStats().then((response) => setGlobalCounts(response.stats));
    return subscribeToAdminDisputes(refresh, refresh);
  }, [currentPage, cursorStack, loadDisputes]);

  useEffect(() => {
    if (!selectedDispute) {
      setEvents([]);
      return;
    }
    setTimelineLoading(true);
    void getDisputeEvents(selectedDispute.id)
      .then((response) => setEvents(response.events))
      .catch((err) =>
        setError(
          err instanceof Error ? err.message : "Failed to load timeline.",
        ),
      )
      .finally(() => setTimelineLoading(false));
  }, [selectedDispute?.id]);

  useEffect(() => {
    if (!selectedDispute && !evidencePreview) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      if (evidencePreview) {
        setEvidencePreview(null);
        setIsEvidenceFullscreen(false);
        return;
      }
      setSelectedDispute(null);
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => {
      window.removeEventListener("keydown", closeOnEscape);
    };
  }, [evidencePreview, selectedDispute?.id]);

  useEffect(() => {
    if (!evidencePreview) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [evidencePreview]);

  const filteredDisputes = useMemo(() => disputes, [disputes]);
  const newItemCandidates = useMemo(
    () =>
      disputes.map((dispute) => ({
        id: dispute.id,
        createdAtMs: dispute.createdAtMs,
        actionable: dispute.status === "open",
      })),
    [disputes],
  );
  const newHighlights = useNewItemHighlights(
    "disputes",
    newItemCandidates,
    !loading,
  );

  function handleNextPage() {
    if (!hasMore || !nextCursor) return;
    setCursorStack((prev) => [...prev, nextCursor]);
    setCurrentPage((prev) => prev + 1);
    void loadDisputes(nextCursor);
  }

  function handlePrevPage() {
    if (currentPage <= 1) return;
    const newStack = [...cursorStack];
    newStack.pop();
    const prevCursor =
      newStack.length > 0 ? newStack[newStack.length - 1] : undefined;
    setCursorStack(newStack);
    setCurrentPage((prev) => prev - 1);
    const goToCursor = currentPage <= 2 ? undefined : prevCursor;
    void loadDisputes(goToCursor);
  }

  function handlePageSizeChange(newSize: number) {
    setPageSize(newSize);
    setCurrentPage(1);
    setCursorStack([]);
  }

  const counts = {
    all: globalCounts.all ?? disputes.length,
    open:
      globalCounts.open ??
      disputes.filter((dispute) => dispute.status === "open").length,
    inProgress:
      globalCounts.under_review != null ||
      globalCounts.awaiting_response != null
        ? (globalCounts.under_review ?? 0) +
          (globalCounts.awaiting_response ?? 0)
        : disputes.filter((dispute) =>
            ["under_review", "awaiting_response"].includes(dispute.status),
          ).length,
    escalated:
      globalCounts.escalated ??
      disputes.filter((dispute) => dispute.status === "escalated").length,
    resolved:
      globalCounts.resolved ??
      disputes.filter((dispute) => dispute.status === "resolved").length,
  };

  function syncStatus(
    id: string,
    status: DisputeStatus,
    patch: Partial<DisputeRow> = {},
  ) {
    setDisputes((prev) =>
      prev.map((dispute) =>
        dispute.id === id ? { ...dispute, ...patch, status } : dispute,
      ),
    );
    setSelectedDispute((prev) =>
      prev?.id === id ? { ...prev, ...patch, status } : prev,
    );
  }

  async function handleResolve(dispute: DisputeRow) {
    const resolution = resolutionSummary.trim();
    if (!resolution) {
      setError("Enter a resolution summary first.");
      return;
    }

    try {
      await resolveCanonicalDispute(
        dispute.id,
        resolution,
        recommendedActions
          .split("\n")
          .map((item) => item.trim())
          .filter(Boolean),
      );
      syncStatus(dispute.id, "resolved", { resolution });
      setResolutionSummary("");
      setRecommendedActions("");
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to resolve dispute.",
      );
    }
  }

  async function handlePriority(
    dispute: DisputeRow,
    priority: DisputePriority,
  ) {
    if (priority === dispute.priority) return;
    const reason = window.prompt("Reason for changing this case priority:");
    if (!reason?.trim()) return;
    try {
      await changeDisputePriority(dispute.id, priority, reason.trim());
      syncStatus(dispute.id, dispute.status, { priority });
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to change priority.",
      );
    }
  }

  async function handleManualClose(dispute: DisputeRow) {
    const reason = window.prompt(
      "Exceptional reason for manually closing this case:",
    );
    if (!reason?.trim()) return;
    try {
      await closeDispute(dispute.id, reason.trim());
      syncStatus(dispute.id, "closed");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to close dispute.");
    }
  }

  async function handleAddMessage(dispute: DisputeRow) {
    if (!caseMessage.trim()) return;
    try {
      await addAdminDisputeComment(
        dispute.id,
        caseMessage.trim(),
        messageVisibility,
      );
      setCaseMessage("");
      const response = await getDisputeEvents(dispute.id);
      setEvents(response.events);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add message.");
    }
  }

  async function handleRequestInfo(dispute: DisputeRow) {
    if (!caseMessage.trim()) {
      setError("Enter the information you need first.");
      return;
    }
    try {
      await requestDisputeInformation(dispute.id, "both", caseMessage.trim());
      syncStatus(dispute.id, "awaiting_response");
      setCaseMessage("");
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to request information.",
      );
    }
  }

  function canAct(dispute: DisputeRow) {
    return dispute.status !== "resolved" && dispute.status !== "closed";
  }

  async function openEvidence(documentId: string) {
    try {
      setEvidenceLoadingId(documentId);
      setError("");
      const response = await getDisputeEvidenceAccess(documentId);
      setEvidencePreview(response);
      setIsEvidenceFullscreen(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Evidence is unavailable.");
    } finally {
      setEvidenceLoadingId(null);
    }
  }

  return (
    <section className="admin-disputes">
      <header className="page-header admin-disputes__header">
        <div>
          <p className="admin-disputes__eyebrow">Case management</p>
          <h1 className="page-title">Disputes</h1>
          <p className="page-subtitle">
            Investigate borrower and lender complaints, review evidence, and
            document every resolution from one workspace.
          </p>
        </div>
        <button
          type="button"
          className="admin-dispute-button admin-dispute-button--secondary"
          onClick={() => void loadDisputes()}
          disabled={loading}
        >
          <RefreshCw
            className={loading ? "admin-dispute-spin" : ""}
            size={17}
          />
          Refresh queue
        </button>
      </header>

      {error ? (
        <div className="admin-dispute-alert" role="alert">
          <AlertTriangle size={18} />
          <span>{error}</span>
          <button type="button" onClick={() => void loadDisputes()}>
            Retry
          </button>
        </div>
      ) : null}

      <div className="admin-dispute-summary" aria-label="Dispute totals">
        {buildDisputeSummaryCards(counts).map((item) => (
          <article
            key={item.label}
            className={`admin-dispute-summary__card admin-dispute-summary__card--${item.tone}`}
          >
            <span className="admin-dispute-summary__icon">
              <SummaryIcon tone={item.tone} />
            </span>
            <div>
              <p>{item.label}</p>
              <strong>{loading ? "—" : item.count}</strong>
            </div>
          </article>
        ))}
      </div>

      <div className="admin-dispute-toolbar">
        <div className="admin-dispute-tabs" aria-label="Filter disputes">
          {DISPUTE_STATUS_FILTERS.map((option) => (
            <button
              key={option.value}
              type="button"
              className={filterStatus === option.value ? "is-active" : ""}
              aria-pressed={filterStatus === option.value}
              onClick={() => setFilterStatus(option.value)}
            >
              {option.label}
            </button>
          ))}
        </div>
        <label className="admin-dispute-search">
          <Search size={17} aria-hidden="true" />
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search case, loan, transaction, or user"
            aria-label="Search disputes"
          />
        </label>
      </div>

      <div className="admin-dispute-workspace">
        <aside className="admin-dispute-list-panel" aria-label="Dispute queue">
          <div className="admin-dispute-list-panel__heading">
            <div>
              <h2>{formatLabel(filterStatus)} cases</h2>
              <p>
                {totalLoaded} loaded · Page {currentPage}
              </p>
            </div>
            <label className="admin-dispute-page-size">
              <span>Rows</span>
              <select
                value={pageSize}
                onChange={(event) =>
                  handlePageSizeChange(Number(event.target.value))
                }
              >
                {PAGE_SIZE_OPTIONS.map((size) => (
                  <option key={size} value={size}>
                    {size}
                  </option>
                ))}
              </select>
            </label>
          </div>

          {loading ? (
            <div className="admin-dispute-empty-state">
              <RefreshCw className="admin-dispute-spin" size={24} />
              <p>Loading the dispute queue...</p>
            </div>
          ) : filteredDisputes.length ? (
            <div className="admin-dispute-case-list">
              {filteredDisputes.map((dispute) => (
                <button
                  key={dispute.id}
                  type="button"
                  className={`admin-dispute-case${
                    selectedDispute?.id === dispute.id ? " is-selected" : ""
                  }${newHighlights.isNew(dispute.id) ? " is-new" : ""}`}
                  onClick={() => {
                    newHighlights.markSeen(dispute.id);
                    setSelectedDispute(dispute);
                  }}
                >
                  <div className="admin-dispute-case__topline">
                    <div className="admin-dispute-case__badges">
                      <StatusBadge status={dispute.status} />
                      {newHighlights.isNew(dispute.id) && (
                        <span className="admin-new-badge">New</span>
                      )}
                    </div>
                    <PriorityBadge priority={dispute.priority} />
                  </div>
                  <strong>{dispute.title}</strong>
                  <p>
                    <UserRound size={14} /> {dispute.raisedBy}
                    <ArrowRight size={13} /> {dispute.againstUser}
                  </p>
                  <div className="admin-dispute-case__footer">
                    <span>{dispute.disputeCode}</span>
                    <span>{dispute.updatedAt}</span>
                    <ChevronRight size={17} />
                  </div>
                </button>
              ))}
            </div>
          ) : (
            <div className="admin-dispute-empty-state">
              <CheckCircle2 size={29} />
              <h3>{search ? "No matching cases" : "Queue is clear"}</h3>
              <p>
                {search
                  ? "Try another case reference, loan, transaction, or user."
                  : "No disputes match the selected status."}
              </p>
            </div>
          )}

          <footer className="admin-dispute-pagination">
            <button
              type="button"
              onClick={handlePrevPage}
              disabled={currentPage <= 1}
              aria-label="Previous dispute page"
            >
              <ChevronLeft size={16} /> Previous
            </button>
            <span>Page {currentPage}</span>
            <button
              type="button"
              onClick={handleNextPage}
              disabled={!hasMore}
              aria-label="Next dispute page"
            >
              Next <ChevronRight size={16} />
            </button>
          </footer>
        </aside>

        <main className="admin-dispute-detail" aria-live="polite">
          {selectedDispute ? (
            <>
              <header className="admin-dispute-detail__header">
                <div>
                  <p>{selectedDispute.disputeCode}</p>
                  <h2>{selectedDispute.title}</h2>
                  <span>
                    Loan {selectedDispute.loanId} · Created{" "}
                    {selectedDispute.createdAt}
                  </span>
                </div>
                <button
                  type="button"
                  className="admin-dispute-icon-button"
                  aria-label="Close dispute details"
                  onClick={() => setSelectedDispute(null)}
                >
                  <X size={18} />
                </button>
              </header>

              <div className="admin-dispute-facts">
                <div>
                  <span>Status</span>
                  <StatusBadge status={selectedDispute.status} />
                </div>
                <div>
                  <span>Priority</span>
                  <PriorityBadge priority={selectedDispute.priority} />
                </div>
                <div>
                  <span>Category</span>
                  <strong>{formatLabel(selectedDispute.category)}</strong>
                </div>
                <div>
                  <span>Raised by</span>
                  <strong>{selectedDispute.raisedBy}</strong>
                </div>
                <div>
                  <span>Against</span>
                  <strong>{selectedDispute.againstUser}</strong>
                </div>
                <div>
                  <span>Transaction</span>
                  <strong>{selectedDispute.transactionId}</strong>
                </div>
                <div>
                  <span>Disputed amount</span>
                  <strong>{selectedDispute.disputedAmount}</strong>
                </div>
              </div>

              <section className="admin-dispute-section">
                <h3>Issue summary</h3>
                <p>{selectedDispute.description}</p>
                <div className="admin-dispute-outcome">
                  <strong>Requested outcome</strong>
                  <p>{selectedDispute.desiredOutcome}</p>
                </div>
              </section>

              {selectedDispute.evidenceUrls.length ? (
                <section className="admin-dispute-section">
                  <h3>Secure evidence</h3>
                  <div className="admin-dispute-evidence-list">
                    {selectedDispute.evidenceUrls.map((documentId, index) => (
                      <button
                        key={documentId}
                        type="button"
                        disabled={evidenceLoadingId === documentId}
                        onClick={() => void openEvidence(documentId)}
                      >
                        <span className="admin-dispute-evidence-list__icon">
                          <FileText size={18} />
                        </span>
                        <span>
                          <strong>Evidence {index + 1}</strong>
                          <small>{documentId.slice(0, 12)}</small>
                        </span>
                        <em>
                          <Eye size={14} />
                          {evidenceLoadingId === documentId
                            ? "Opening"
                            : "Open"}
                        </em>
                      </button>
                    ))}
                  </div>
                </section>
              ) : null}

              {selectedDispute.resolution !== "N/A" ? (
                <section className="admin-dispute-resolution admin-dispute-resolution--complete">
                  <div>
                    <CheckCircle2 size={19} />
                    <strong>Recorded resolution</strong>
                  </div>
                  <p>{selectedDispute.resolution}</p>
                </section>
              ) : null}

              {selectedDispute.escalationReason !== "N/A" ? (
                <section className="admin-dispute-resolution admin-dispute-resolution--escalated">
                  <div>
                    <ShieldAlert size={19} />
                    <strong>Escalation reason</strong>
                  </div>
                  <p>{selectedDispute.escalationReason}</p>
                </section>
              ) : null}

              <section className="admin-dispute-section">
                <h3>Case timeline</h3>
                {timelineLoading ? (
                  <p className="admin-dispute-muted">Loading timeline...</p>
                ) : events.length ? (
                  <div className="admin-dispute-timeline">
                    {events.map((event) => (
                      <article key={event.id}>
                        <span className="admin-dispute-timeline__marker" />
                        <div>
                          <div className="admin-dispute-timeline__heading">
                            <strong>{formatLabel(event.type)}</strong>
                            <time>{formatFirestoreDate(event.createdAt)}</time>
                          </div>
                          <p>{event.message}</p>
                          <small>
                            {formatLabel(event.actorRole)}
                            {event.visibility === "admin" ? (
                              <em>
                                <LockKeyhole size={12} /> Private admin note
                              </em>
                            ) : null}
                          </small>
                          {event.documentIds.length ? (
                            <div className="admin-dispute-evidence-list admin-dispute-evidence-list--compact">
                              {event.documentIds.map((documentId, index) => (
                                <button
                                  key={documentId}
                                  type="button"
                                  disabled={evidenceLoadingId === documentId}
                                  onClick={() => void openEvidence(documentId)}
                                >
                                  <span className="admin-dispute-evidence-list__icon">
                                    <FileText size={15} />
                                  </span>
                                  <span>
                                    <strong>Attachment {index + 1}</strong>
                                    <small>Timeline evidence</small>
                                  </span>
                                  <em>
                                    <Eye size={14} /> Open
                                  </em>
                                </button>
                              ))}
                            </div>
                          ) : null}
                        </div>
                      </article>
                    ))}
                  </div>
                ) : (
                  <p className="admin-dispute-muted">
                    No timeline entries yet.
                  </p>
                )}
              </section>

              {canAct(selectedDispute) ? (
                <>
                  <section className="admin-dispute-section admin-dispute-controls">
                    <div className="admin-dispute-section__title">
                      <div>
                        <h3>Case priority</h3>
                        <p>Set how urgently this dispute should be reviewed.</p>
                      </div>
                      <Flag size={18} />
                    </div>
                    <div className="admin-dispute-control-grid admin-dispute-control-grid--single">
                      <label>
                        <span>Priority</span>
                        <select
                          value={selectedDispute.priority}
                          onChange={(event) =>
                            void handlePriority(
                              selectedDispute,
                              event.target.value as DisputePriority,
                            )
                          }
                        >
                          {(["low", "medium", "high", "critical"] as const).map(
                            (priority) => (
                              <option key={priority} value={priority}>
                                {formatLabel(priority)}
                              </option>
                            ),
                          )}
                        </select>
                      </label>
                    </div>
                  </section>

                  <section className="admin-dispute-composer">
                    <div className="admin-dispute-section__title">
                      <div>
                        <h3>Case communication</h3>
                        <p>
                          Share an update or keep a private investigation note.
                        </p>
                      </div>
                      <MessageSquareText size={18} />
                    </div>
                    <textarea
                      rows={3}
                      placeholder="Write a response, information request, or internal note..."
                      value={caseMessage}
                      onChange={(event) => setCaseMessage(event.target.value)}
                    />
                    <div className="admin-dispute-composer__actions">
                      <label>
                        <LockKeyhole size={15} />
                        <select
                          value={messageVisibility}
                          onChange={(event) =>
                            setMessageVisibility(
                              event.target.value as "shared" | "admin",
                            )
                          }
                        >
                          <option value="shared">
                            Visible to both parties
                          </option>
                          <option value="admin">Private admin note</option>
                        </select>
                      </label>
                      <button
                        type="button"
                        className="admin-dispute-button admin-dispute-button--secondary"
                        disabled={!caseMessage.trim()}
                        onClick={() => void handleRequestInfo(selectedDispute)}
                      >
                        Request information
                      </button>
                      <button
                        type="button"
                        className="admin-dispute-button admin-dispute-button--primary"
                        disabled={!caseMessage.trim()}
                        onClick={() => void handleAddMessage(selectedDispute)}
                      >
                        <Send size={16} /> Add update
                      </button>
                    </div>
                  </section>

                  <section className="admin-dispute-composer admin-dispute-composer--resolution">
                    <div className="admin-dispute-section__title">
                      <div>
                        <h3>Resolve case</h3>
                        <p>
                          Record the decision and any actions the parties must
                          take.
                        </p>
                      </div>
                      <CheckCircle2 size={18} />
                    </div>
                    <textarea
                      rows={3}
                      placeholder="Required resolution summary..."
                      value={resolutionSummary}
                      onChange={(event) =>
                        setResolutionSummary(event.target.value)
                      }
                    />
                    <textarea
                      rows={3}
                      placeholder="Recommended actions, one per line"
                      value={recommendedActions}
                      onChange={(event) =>
                        setRecommendedActions(event.target.value)
                      }
                    />
                    <div className="admin-dispute-composer__actions">
                      <button
                        type="button"
                        className="admin-dispute-button admin-dispute-button--danger-ghost"
                        onClick={() => void handleManualClose(selectedDispute)}
                      >
                        Manual close
                      </button>
                      <button
                        type="button"
                        className="admin-dispute-button admin-dispute-button--success"
                        disabled={!resolutionSummary.trim()}
                        onClick={() => void handleResolve(selectedDispute)}
                      >
                        <CheckCircle2 size={16} /> Resolve dispute
                      </button>
                    </div>
                  </section>
                </>
              ) : null}
            </>
          ) : (
            <div className="admin-dispute-detail-empty">
              <span>
                <ShieldAlert size={30} />
              </span>
              <h2>Select a dispute</h2>
              <p>
                Choose a case from the queue to review its participants,
                evidence, timeline, and administrative actions.
              </p>
            </div>
          )}
        </main>
      </div>

      {evidencePreview ? (
        <div
          className="admin-dispute-evidence-preview-backdrop"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              setEvidencePreview(null);
              setIsEvidenceFullscreen(false);
            }
          }}
        >
          <section
            className={`admin-dispute-evidence-preview${
              isEvidenceFullscreen
                ? " admin-dispute-evidence-preview--fullscreen"
                : ""
            }`}
            role="dialog"
            aria-modal="true"
            aria-labelledby="admin-dispute-evidence-preview-title"
          >
            <header className="admin-dispute-evidence-preview__header">
              <div className="admin-dispute-evidence-preview__identity">
                <span className="admin-dispute-evidence-preview__file-icon">
                  <FileText size={20} />
                </span>
                <div>
                  <span>Secure evidence preview</span>
                  <h2 id="admin-dispute-evidence-preview-title">
                    {evidencePreview.fileName || "Evidence file"}
                  </h2>
                  <small>
                    {evidencePreview.mimeType.toLowerCase().includes("pdf")
                      ? "PDF document"
                      : "Image attachment"}
                  </small>
                </div>
              </div>
              <div className="admin-dispute-evidence-preview__actions">
                <button
                  type="button"
                  className="admin-dispute-evidence-toolbar-button"
                  onClick={() => setIsEvidenceFullscreen((current) => !current)}
                >
                  {isEvidenceFullscreen ? (
                    <Minimize2 size={18} />
                  ) : (
                    <Maximize2 size={18} />
                  )}
                  <span>
                    {isEvidenceFullscreen ? "Exit full screen" : "Full screen"}
                  </span>
                </button>
                <a
                  className="admin-dispute-evidence-toolbar-button"
                  href={evidencePreview.accessUrl}
                  target="_blank"
                  rel="noreferrer"
                >
                  <ExternalLink size={18} />
                  <span>Open original</span>
                </a>
                <button
                  type="button"
                  className="admin-dispute-evidence-toolbar-button admin-dispute-evidence-toolbar-button--close"
                  aria-label="Close evidence preview"
                  onClick={() => {
                    setEvidencePreview(null);
                    setIsEvidenceFullscreen(false);
                  }}
                >
                  <X size={18} />
                </button>
              </div>
            </header>
            <div className="admin-dispute-evidence-preview__body">
              {evidencePreview.mimeType.toLowerCase().includes("pdf") ||
              evidencePreview.fileName.toLowerCase().endsWith(".pdf") ? (
                <iframe
                  src={evidencePreview.accessUrl}
                  title={evidencePreview.fileName || "Dispute evidence PDF"}
                />
              ) : (
                <img
                  src={evidencePreview.accessUrl}
                  alt={evidencePreview.fileName || "Dispute evidence"}
                />
              )}
            </div>
            <footer className="admin-dispute-evidence-preview__footer">
              <span>
                <LockKeyhole size={14} /> Temporary authenticated preview
              </span>
              <span>Press Esc to close</span>
            </footer>
          </section>
        </div>
      ) : null}
    </section>
  );
}
