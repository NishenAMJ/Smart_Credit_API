import type { CSSProperties } from "react";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  Eye,
  Search,
  ShieldAlert,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import {
  addAdminDisputeComment,
  assignDispute,
  changeDisputePriority,
  closeDispute,
  escalateDispute,
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

const PAGE_SIZE_OPTIONS = [10, 20, 50, 100] as const;

type StyleValue =
  | CSSProperties
  | ((disabled: boolean) => CSSProperties)
  | ((color: string, bg: string) => CSSProperties);

type DisputeSummaryCard = {
  label: string;
  count: number;
  color: string;
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
  resolution: string;
  escalationReason: string;
  notes: string;
};

function mapDispute(dispute: AdminDispute): DisputeRow {
  return {
    id: dispute.id,
    disputeCode:
      dispute.disputeCode || `DSP-${dispute.id.slice(0, 6).toUpperCase()}`,
    title: dispute.title || `${dispute.category} dispute`,
    transactionId: dispute.transactionId || "N/A",
    loanId: dispute.loanId || "N/A",
    raisedBy:
      dispute.raisedBy ||
      dispute.borrowerName ||
      dispute.borrowerId ||
      "Unknown",
    againstUser:
      dispute.againstUser ||
      dispute.lenderName ||
      dispute.lenderId ||
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
    resolution: dispute.resolution?.summary || "N/A",
    escalationReason: dispute.escalationReason || "N/A",
    notes: dispute.notes || "N/A",
  };
}

function StatusBadge({ status }: { status: DisputeStatus }) {
  const className = {
    open: "badge badge-warning",
    under_review: "badge badge-warning",
    awaiting_response: "badge badge-warning",
    resolved: "badge badge-success",
    escalated: "badge badge-danger",
    closed: "badge badge-gray",
  }[status];

  return <span className={className}>{status}</span>;
}

function PriorityBadge({ priority }: { priority: DisputePriority }) {
  const style = {
    low: S.priorityLow,
    medium: S.priorityMedium,
    high: S.priorityHigh,
    critical: S.priorityCritical,
  }[priority];

  return <span style={style}>{priority}</span>;
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
    { label: "All Disputes", count: counts.all, color: "#007AFF" },
    { label: "Open", count: counts.open, color: "#F59E0B" },
    { label: "In Progress", count: counts.inProgress, color: "#8B5CF6" },
    { label: "Escalated", count: counts.escalated, color: "#EF4444" },
    { label: "Resolved", count: counts.resolved, color: "#10B981" },
  ];
}

// Renders the admin dispute review queue and resolution workflow.
export default function Disputes() {
  const [disputes, setDisputes] = useState<DisputeRow[]>([]);
  const [selectedDispute, setSelectedDispute] = useState<DisputeRow | null>(
    null,
  );
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState<DisputeStatus | "all">(
    "all",
  );
  const [loading, setLoading] = useState(true);
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
        const response = await getDisputes({ limit: pageSize, cursor });
        setDisputes(response.disputes.map(mapDispute));
        setHasMore(response.hasMore ?? false);
        setNextCursor(response.nextCursor);
        setTotalLoaded(response.count);
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Failed to load disputes.",
        );
      } finally {
        setLoading(false);
      }
    },
    [pageSize],
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
    void getDisputeEvents(selectedDispute.id)
      .then((response) => setEvents(response.events))
      .catch((err) =>
        setError(
          err instanceof Error ? err.message : "Failed to load timeline.",
        ),
      );
  }, [selectedDispute?.id]);

  useEffect(() => {
    if (!selectedDispute) return;
    const previousOverflow = document.body.style.overflow;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setSelectedDispute(null);
    };
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", closeOnEscape);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", closeOnEscape);
    };
  }, [selectedDispute?.id]);

  const filteredDisputes = useMemo(() => {
    return disputes.filter((dispute) => {
      const searchValue = search.toLowerCase();
      const matchesSearch =
        dispute.id.toLowerCase().includes(searchValue) ||
        dispute.disputeCode.toLowerCase().includes(searchValue) ||
        dispute.title.toLowerCase().includes(searchValue) ||
        dispute.loanId.toLowerCase().includes(searchValue) ||
        dispute.transactionId.toLowerCase().includes(searchValue) ||
        dispute.raisedBy.toLowerCase().includes(searchValue) ||
        dispute.againstUser.toLowerCase().includes(searchValue) ||
        dispute.description.toLowerCase().includes(searchValue);
      const matchesStatus =
        filterStatus === "all" || dispute.status === filterStatus;
      return matchesSearch && matchesStatus;
    });
  }, [disputes, filterStatus, search]);

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
      globalCounts.under_review ??
      disputes.filter((dispute) => dispute.status === "under_review").length,
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

  async function handleClaim(dispute: DisputeRow) {
    try {
      await assignDispute(dispute.id);
      syncStatus(dispute.id, "under_review");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to claim dispute.");
    }
  }

  async function handleReassign(dispute: DisputeRow) {
    const adminId = window.prompt(
      "Enter the admin user ID to assign this case to:",
    );
    if (!adminId?.trim()) return;
    try {
      await assignDispute(dispute.id, adminId.trim());
      await loadDisputes();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to reassign dispute.",
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

  async function handleEscalate(dispute: DisputeRow) {
    const escalationReason = `Escalated ${dispute.priority} priority dispute for further investigation`;

    try {
      await escalateDispute(dispute.id, escalationReason);
      syncStatus(dispute.id, "escalated", { escalationReason });
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to escalate dispute.",
      );
    }
  }

  function canAct(dispute: DisputeRow) {
    return dispute.status !== "resolved" && dispute.status !== "closed";
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Disputes</h1>
          <p className="page-subtitle">
            Review borrower and lender complaints connected to loans and
            repayments
          </p>
        </div>
      </div>

      {error && (
        <div className="card" style={S.errorCard}>
          {error}
        </div>
      )}

      <div style={S.summaryGrid}>
        {buildDisputeSummaryCards(counts).map((item) => (
          <div key={item.label} className="card">
            <p style={S.cardLabel}>{item.label}</p>
            <p style={{ ...S.cardValue, color: item.color }}>
              {loading ? "..." : item.count}
            </p>
          </div>
        ))}
      </div>

      <div style={S.filtersRow}>
        <div style={{ position: "relative", flex: 1, maxWidth: 360 }}>
          <Search size={15} style={S.searchIcon} />
          <input
            className="input"
            placeholder="Search by dispute, loan, transaction or user..."
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            style={{ paddingLeft: 36 }}
          />
        </div>

        <div className="tabs">
          {(
            [
              "all",
              "open",
              "under_review",
              "escalated",
              "resolved",
              "closed",
            ] as const
          ).map((status) => (
            <button
              key={status}
              className={`tab ${filterStatus === status ? "active" : ""}`}
              onClick={() => setFilterStatus(status)}
            >
              {status}
            </button>
          ))}
        </div>
      </div>

      <div className="table-container">
        <table>
          <thead>
            <tr>
              <th>Dispute</th>
              <th>Raised By</th>
              <th>Against</th>
              <th>Category</th>
              <th>Priority</th>
              <th>Created</th>
              <th>Status</th>
              <th style={S.actionHeader}>Action</th>
            </tr>
          </thead>
          <tbody>
            {filteredDisputes.length === 0 ? (
              <tr>
                <td colSpan={8} style={S.emptyCell}>
                  {loading ? "Loading disputes..." : "No disputes found."}
                </td>
              </tr>
            ) : (
              filteredDisputes.map((dispute) => (
                <tr key={dispute.id}>
                  <td>
                    <div style={{ maxWidth: 260 }}>
                      <p style={{ fontWeight: 700 }}>{dispute.title}</p>
                      <p style={S.mutedLine}>
                        Case: {dispute.disputeCode} • Loan: {dispute.loanId}
                      </p>
                    </div>
                  </td>
                  <td>{dispute.raisedBy}</td>
                  <td>{dispute.againstUser}</td>
                  <td style={{ textTransform: "capitalize" }}>
                    {dispute.category}
                  </td>
                  <td>
                    <PriorityBadge priority={dispute.priority} />
                  </td>
                  <td>{dispute.createdAt}</td>
                  <td>
                    <StatusBadge status={dispute.status} />
                  </td>
                  <td style={S.actionCell}>
                    <div style={S.actionRow}>
                      <button
                        style={S.iconButton("#6B7280", "#F3F4F6")}
                        onClick={() => setSelectedDispute(dispute)}
                        title="View"
                        aria-label="View dispute"
                      >
                        <Eye
                          size={14}
                          color="#6B7280"
                          strokeWidth={2.2}
                          style={S.iconGraphic}
                        />
                      </button>
                      {canAct(dispute) && (
                        <>
                          <button
                            style={S.iconButton("#10B981", "#ECFDF5")}
                            onClick={() => setSelectedDispute(dispute)}
                            title="Resolve"
                            aria-label="Resolve dispute"
                          >
                            <CheckCircle2
                              size={14}
                              color="#10B981"
                              strokeWidth={2.2}
                              style={S.iconGraphic}
                            />
                          </button>
                          <button
                            style={S.iconButton("#EF4444", "#FEF2F2")}
                            onClick={() => void handleEscalate(dispute)}
                            title="Escalate"
                            aria-label="Escalate dispute"
                          >
                            <ShieldAlert
                              size={14}
                              color="#EF4444"
                              strokeWidth={2.2}
                              style={S.iconGraphic}
                            />
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>

        {/* Pagination Controls */}
        <div style={S.paginationBar}>
          <div style={S.paginationInfo}>
            <span style={{ fontSize: 13, color: "#6B7280" }}>
              Showing{" "}
              {filteredDisputes.length > 0
                ? (currentPage - 1) * pageSize + 1
                : 0}
              –{(currentPage - 1) * pageSize + totalLoaded}{" "}
              {hasMore ? "" : "(last page)"}
            </span>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <label style={{ fontSize: 13, color: "#6B7280" }}>Rows:</label>
              <select
                value={pageSize}
                onChange={(e) => handlePageSizeChange(Number(e.target.value))}
                style={S.pageSizeSelect}
              >
                {PAGE_SIZE_OPTIONS.map((size) => (
                  <option key={size} value={size}>
                    {size}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div style={S.paginationButtons}>
            <button
              style={S.pageButton(currentPage <= 1)}
              onClick={handlePrevPage}
              disabled={currentPage <= 1}
              title="Previous page"
            >
              <ChevronLeft size={16} />
              Previous
            </button>
            <span style={S.pageIndicator}>Page {currentPage}</span>
            <button
              style={S.pageButton(!hasMore)}
              onClick={handleNextPage}
              disabled={!hasMore}
              title="Next page"
            >
              Next
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      </div>

      {selectedDispute && (
        <div style={S.modalOverlay} onClick={() => setSelectedDispute(null)}>
          <div style={S.modal} onClick={(event) => event.stopPropagation()}>
            <div style={S.modalHeader}>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <div style={S.bigIcon}>
                  <AlertTriangle size={20} color="#F59E0B" />
                </div>
                <div>
                  <h3 style={{ fontSize: 18, fontWeight: 700 }}>
                    {selectedDispute.title}
                  </h3>
                  <p style={S.mutedLine}>Case: {selectedDispute.disputeCode}</p>
                </div>
              </div>
              <button
                style={S.closeButton}
                onClick={() => setSelectedDispute(null)}
              >
                x
              </button>
            </div>

            <div style={S.detailsGrid}>
              <Detail label="Status" value={selectedDispute.status} />
              <Detail label="Priority" value={selectedDispute.priority} />
              <Detail label="Raised By" value={selectedDispute.raisedBy} />
              <Detail
                label="Against User"
                value={selectedDispute.againstUser}
              />
              <Detail label="Created" value={selectedDispute.createdAt} />
              <Detail
                label="Disputed Amount"
                value={selectedDispute.disputedAmount}
              />
              <Detail label="Category" value={selectedDispute.category} />
              <Detail label="Case Code" value={selectedDispute.disputeCode} />
              <Detail
                label="Description"
                value={selectedDispute.description}
                wide
              />
              <Detail
                label="Evidence"
                value={
                  selectedDispute.evidenceUrls.length
                    ? `${selectedDispute.evidenceUrls.length} secure file(s)`
                    : "N/A"
                }
                wide
              />
              {selectedDispute.evidenceUrls.map((documentId) => (
                <button
                  key={documentId}
                  className="btn-secondary btn-sm"
                  onClick={() =>
                    void getDisputeEvidenceAccess(documentId).then((response) =>
                      window.open(
                        response.accessUrl,
                        "_blank",
                        "noopener,noreferrer",
                      ),
                    )
                  }
                >
                  Open evidence {documentId.slice(0, 8)}
                </button>
              ))}
              {selectedDispute.status === "resolved" &&
                selectedDispute.resolution !== "N/A" && (
                  <Detail
                    label="Resolution"
                    value={selectedDispute.resolution}
                    wide
                  />
                )}
              {selectedDispute.status === "escalated" &&
                selectedDispute.escalationReason !== "N/A" && (
                  <Detail
                    label="Escalation Reason"
                    value={selectedDispute.escalationReason}
                    wide
                  />
                )}
            </div>

            <div style={{ marginTop: 20 }}>
              <h4 style={{ marginBottom: 10 }}>Case timeline</h4>
              <div
                style={{
                  display: "grid",
                  gap: 8,
                  maxHeight: 220,
                  overflowY: "auto",
                }}
              >
                {events.length ? (
                  events.map((event) => (
                    <div key={event.id} style={S.detailCard}>
                      <strong>{event.type.replace(/_/g, " ")}</strong>
                      <div style={S.mutedLine}>
                        {event.actorRole} ·{" "}
                        {formatFirestoreDate(event.createdAt)}
                      </div>
                      <div>{event.message}</div>
                      {event.documentIds.map((documentId) => (
                        <button
                          key={documentId}
                          className="btn-secondary btn-sm"
                          onClick={() =>
                            void getDisputeEvidenceAccess(documentId).then(
                              (response) =>
                                window.open(
                                  response.accessUrl,
                                  "_blank",
                                  "noopener,noreferrer",
                                ),
                            )
                          }
                        >
                          Open attached evidence
                        </button>
                      ))}
                      {event.visibility === "admin" ? (
                        <small>Private admin note</small>
                      ) : null}
                    </div>
                  ))
                ) : (
                  <p style={S.mutedLine}>No timeline entries yet.</p>
                )}
              </div>
            </div>

            {canAct(selectedDispute) && (
              <div style={{ display: "grid", gap: 10, marginTop: 18 }}>
                <textarea
                  className="input"
                  rows={3}
                  placeholder="Write a shared response, information request, or internal note..."
                  value={caseMessage}
                  onChange={(event) => setCaseMessage(event.target.value)}
                />
                <select
                  className="input"
                  value={messageVisibility}
                  onChange={(event) =>
                    setMessageVisibility(
                      event.target.value as "shared" | "admin",
                    )
                  }
                >
                  <option value="shared">Visible to both parties</option>
                  <option value="admin">Private admin note</option>
                </select>
                <div style={S.modalActions}>
                  <button
                    className="btn-secondary btn-sm"
                    onClick={() => void handleClaim(selectedDispute)}
                  >
                    Claim case
                  </button>
                  <button
                    className="btn-secondary btn-sm"
                    onClick={() => void handleReassign(selectedDispute)}
                  >
                    Reassign
                  </button>
                  <button
                    className="btn-secondary btn-sm"
                    onClick={() => void handleAddMessage(selectedDispute)}
                  >
                    Add message
                  </button>
                  <button
                    className="btn-secondary btn-sm"
                    onClick={() => void handleRequestInfo(selectedDispute)}
                  >
                    Request information
                  </button>
                </div>
                <label>
                  Priority
                  <select
                    className="input"
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
                          {priority}
                        </option>
                      ),
                    )}
                  </select>
                </label>
                <textarea
                  className="input"
                  rows={3}
                  placeholder="Required resolution summary..."
                  value={resolutionSummary}
                  onChange={(event) => setResolutionSummary(event.target.value)}
                />
                <textarea
                  className="input"
                  rows={3}
                  placeholder="Recommended actions, one per line"
                  value={recommendedActions}
                  onChange={(event) =>
                    setRecommendedActions(event.target.value)
                  }
                />
              </div>
            )}

            <div style={S.modalActions}>
              {canAct(selectedDispute) && (
                <>
                  <button
                    className="btn-success btn-sm"
                    onClick={() => void handleResolve(selectedDispute)}
                  >
                    Resolve
                  </button>
                  <button
                    className="btn-danger btn-sm"
                    onClick={() => void handleEscalate(selectedDispute)}
                  >
                    Escalate
                  </button>
                  <button
                    className="btn-secondary btn-sm"
                    onClick={() => void handleManualClose(selectedDispute)}
                  >
                    Manual close
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Detail({
  label,
  value,
  wide = false,
}: {
  label: string;
  value: string;
  wide?: boolean;
}) {
  return (
    <div style={{ ...S.detailCard, ...(wide ? S.detailWide : {}) }}>
      <div style={S.detailLabel}>{label}</div>
      <div style={S.detailValue}>{value}</div>
    </div>
  );
}

const S = {
  errorCard: {
    marginBottom: 16,
    color: "#991B1B",
    background: "#FEF2F2",
    border: "1px solid #FECACA",
  },
  summaryGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(5, minmax(0, 1fr))",
    gap: 16,
    marginBottom: 24,
  },
  cardLabel: {
    fontSize: 13,
    color: "#6B7280",
    fontWeight: 500,
  },
  cardValue: {
    marginTop: 4,
    fontSize: 28,
    fontWeight: 700,
  },
  filtersRow: {
    display: "flex",
    alignItems: "center",
    gap: 12,
    marginBottom: 16,
    flexWrap: "wrap",
  },
  searchIcon: {
    position: "absolute",
    left: 12,
    top: "50%",
    transform: "translateY(-50%)",
    color: "#6B7280",
  },
  mutedLine: {
    fontSize: 12,
    color: "#6B7280",
  },
  emptyCell: {
    textAlign: "center",
    padding: 40,
    color: "#6B7280",
  },
  actionRow: {
    display: "flex",
    gap: 6,
    justifyContent: "center",
    minWidth: 108,
  },
  actionHeader: {
    textAlign: "center",
    minWidth: 132,
    position: "sticky",
    right: 0,
    zIndex: 2,
    background: "#F5F6FA",
    boxShadow: "-1px 0 0 #F3F4F6",
  },
  actionCell: {
    minWidth: 132,
    position: "sticky",
    right: 0,
    background: "#FFFFFF",
    boxShadow: "-1px 0 0 #F3F4F6",
    zIndex: 1,
  },
  iconButton: (color: string, bg: string) => ({
    width: 30,
    height: 30,
    padding: 0,
    borderRadius: 6,
    border: "none",
    background: bg,
    color,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    cursor: "pointer",
    lineHeight: 0,
    flexShrink: 0,
    overflow: "visible",
  }),
  iconGraphic: {
    display: "block",
    flexShrink: 0,
  },
  priorityLow: {
    color: "#047857",
    background: "#ECFDF5",
    padding: "4px 8px",
    borderRadius: 999,
    fontSize: 12,
    fontWeight: 700,
    textTransform: "capitalize",
  },
  priorityMedium: {
    color: "#92400E",
    background: "#FFFBEB",
    padding: "4px 8px",
    borderRadius: 999,
    fontSize: 12,
    fontWeight: 700,
    textTransform: "capitalize",
  },
  priorityHigh: {
    color: "#B45309",
    background: "#FFF7ED",
    padding: "4px 8px",
    borderRadius: 999,
    fontSize: 12,
    fontWeight: 700,
    textTransform: "capitalize",
  },
  priorityCritical: {
    color: "#991B1B",
    background: "#FEF2F2",
    padding: "4px 8px",
    borderRadius: 999,
    fontSize: 12,
    fontWeight: 700,
    textTransform: "capitalize",
  },
  modalOverlay: {
    position: "fixed",
    inset: 0,
    background: "rgba(0,0,0,0.45)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: 16,
    boxSizing: "border-box",
    overflow: "hidden",
    zIndex: 1000,
  },
  modal: {
    width: "min(900px, 100%)",
    maxHeight: "calc(100vh - 32px)",
    background: "#FFFFFF",
    borderRadius: 12,
    padding: 24,
    boxSizing: "border-box",
    overflowX: "hidden",
    overflowY: "auto",
    overscrollBehavior: "contain",
    boxShadow: "0 24px 64px rgba(15, 23, 42, 0.28)",
  },
  modalHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    position: "sticky",
    top: -24,
    zIndex: 4,
    margin: "-24px -24px 16px",
    padding: "20px 24px 16px",
    background: "#FFFFFF",
    borderBottom: "1px solid #E5E7EB",
  },
  bigIcon: {
    width: 44,
    height: 44,
    borderRadius: 10,
    background: "#FFFBEB",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  closeButton: {
    border: "none",
    background: "transparent",
    fontSize: 22,
    cursor: "pointer",
    color: "#6B7280",
  },
  detailsGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
    gap: 12,
  },
  detailCard: {
    background: "#F8FAFC",
    border: "1px solid #E2E8F0",
    borderRadius: 8,
    padding: 14,
  },
  detailWide: {
    gridColumn: "1 / -1",
  },
  detailLabel: {
    fontSize: 12,
    color: "#6B7280",
    marginBottom: 4,
  },
  detailValue: {
    fontSize: 14,
    fontWeight: 600,
    color: "#111827",
    overflowWrap: "anywhere",
  },
  modalActions: {
    display: "flex",
    justifyContent: "flex-end",
    gap: 8,
    marginTop: 16,
  },
  paginationBar: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "12px 16px",
    borderTop: "1px solid #F3F4F6",
    flexWrap: "wrap",
    gap: 12,
  },
  paginationInfo: {
    display: "flex",
    alignItems: "center",
    gap: 16,
  },
  pageSizeSelect: {
    padding: "4px 8px",
    borderRadius: 6,
    border: "1.5px solid #E5E7EB",
    fontSize: 13,
    color: "#374151",
    background: "#FFFFFF",
    cursor: "pointer",
    outline: "none",
    fontFamily: "inherit",
  },
  paginationButtons: {
    display: "flex",
    alignItems: "center",
    gap: 8,
  },
  pageButton: (disabled: boolean): CSSProperties => ({
    display: "inline-flex",
    alignItems: "center",
    gap: 4,
    padding: "6px 14px",
    borderRadius: 8,
    border: "1.5px solid #E5E7EB",
    background: disabled ? "#F9FAFB" : "#FFFFFF",
    color: disabled ? "#D1D5DB" : "#374151",
    fontSize: 13,
    fontWeight: 500,
    cursor: disabled ? "not-allowed" : "pointer",
    transition: "all 0.15s",
    fontFamily: "inherit",
  }),
  pageIndicator: {
    fontSize: 13,
    fontWeight: 600,
    color: "#374151",
    padding: "6px 12px",
    background: "#F3F4F6",
    borderRadius: 8,
  },
} satisfies Record<string, StyleValue>;
