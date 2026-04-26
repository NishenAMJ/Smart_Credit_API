import type { CSSProperties } from "react";
import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, CheckCircle2, Eye, Search, ShieldAlert } from "lucide-react";
import {
  escalateDispute,
  getDisputes,
  resolveDispute,
  type AdminDispute,
  type DisputePriority,
  type DisputeStatus,
} from "../../lib/api";
import { formatFirestoreDate } from "../../lib/admin-format";

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
    disputeCode: dispute.disputeCode || `DSP-${dispute.id.slice(0, 6).toUpperCase()}`,
    title: dispute.title || `${dispute.category} dispute`,
    transactionId: dispute.transactionId || "N/A",
    loanId: dispute.loanId || "N/A",
    raisedBy: dispute.raisedBy || dispute.borrowerName || dispute.borrowerId || "Unknown",
    againstUser: dispute.againstUser || dispute.lenderName || dispute.lenderId || "Unknown",
    description: dispute.description || dispute.title || "No description provided",
    category: dispute.category,
    status: dispute.status,
    priority: dispute.priority,
    disputedAmount:
      typeof dispute.disputedAmount === "number" ? `LKR ${dispute.disputedAmount.toLocaleString()}` : "N/A",
    evidenceUrls: dispute.evidenceUrls || [],
    createdAt: formatFirestoreDate(dispute.createdAt),
    resolution: dispute.resolution || "N/A",
    escalationReason: dispute.escalationReason || "N/A",
    notes: dispute.notes || "N/A",
  };
}

function StatusBadge({ status }: { status: DisputeStatus }) {
  const className = {
    open: "badge badge-warning",
    "in-progress": "badge badge-warning",
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

export default function Disputes() {
  const [disputes, setDisputes] = useState<DisputeRow[]>([]);
  const [selectedDispute, setSelectedDispute] = useState<DisputeRow | null>(null);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState<DisputeStatus | "all">("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadDisputes() {
      try {
        const response = await getDisputes();
        setDisputes(response.disputes.map(mapDispute));
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load disputes.");
      } finally {
        setLoading(false);
      }
    }

    void loadDisputes();
  }, []);

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
      const matchesStatus = filterStatus === "all" || dispute.status === filterStatus;
      return matchesSearch && matchesStatus;
    });
  }, [disputes, filterStatus, search]);

  const counts = {
    all: disputes.length,
    open: disputes.filter((dispute) => dispute.status === "open").length,
    inProgress: disputes.filter((dispute) => dispute.status === "in-progress").length,
    escalated: disputes.filter((dispute) => dispute.status === "escalated").length,
    resolved: disputes.filter((dispute) => dispute.status === "resolved").length,
  };

  function syncStatus(id: string, status: DisputeStatus, patch: Partial<DisputeRow> = {}) {
    setDisputes((prev) =>
      prev.map((dispute) => (dispute.id === id ? { ...dispute, ...patch, status } : dispute)),
    );
    setSelectedDispute((prev) => (prev?.id === id ? { ...prev, ...patch, status } : prev));
  }

  async function handleResolve(dispute: DisputeRow) {
    const resolution = `Resolved by admin for ${dispute.category} dispute`;

    try {
      await resolveDispute(dispute.id, resolution);
      syncStatus(dispute.id, "resolved", { resolution });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to resolve dispute.");
    }
  }

  async function handleEscalate(dispute: DisputeRow) {
    const escalationReason = `Escalated ${dispute.priority} priority dispute for further investigation`;

    try {
      await escalateDispute(dispute.id, escalationReason);
      syncStatus(dispute.id, "escalated", { escalationReason });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to escalate dispute.");
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
          <p className="page-subtitle">Review borrower and lender complaints connected to loans and repayments</p>
        </div>
      </div>

      {error && <div className="card" style={S.errorCard}>{error}</div>}

      <div style={S.summaryGrid}>
        {[
          { label: "All Disputes", count: counts.all, color: "#007AFF" },
          { label: "Open", count: counts.open, color: "#F59E0B" },
          { label: "In Progress", count: counts.inProgress, color: "#8B5CF6" },
          { label: "Escalated", count: counts.escalated, color: "#EF4444" },
          { label: "Resolved", count: counts.resolved, color: "#10B981" },
        ].map((item) => (
          <div key={item.label} className="card">
            <p style={S.cardLabel}>{item.label}</p>
            <p style={{ ...S.cardValue, color: item.color }}>{loading ? "..." : item.count}</p>
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
          {(["all", "open", "in-progress", "escalated", "resolved", "closed"] as const).map((status) => (
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
              <th style={{ textAlign: "center" }}>Action</th>
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
                      <p style={S.mutedLine}>Case: {dispute.disputeCode} • Loan: {dispute.loanId}</p>
                    </div>
                  </td>
                  <td>{dispute.raisedBy}</td>
                  <td>{dispute.againstUser}</td>
                  <td style={{ textTransform: "capitalize" }}>{dispute.category}</td>
                  <td><PriorityBadge priority={dispute.priority} /></td>
                  <td>{dispute.createdAt}</td>
                  <td><StatusBadge status={dispute.status} /></td>
                  <td>
                    <div style={S.actionRow}>
                      <button style={S.iconButton("#6B7280", "#F3F4F6")} onClick={() => setSelectedDispute(dispute)} title="View">
                        <Eye size={14} />
                      </button>
                      {canAct(dispute) && (
                        <>
                          <button style={S.iconButton("#10B981", "#ECFDF5")} onClick={() => void handleResolve(dispute)} title="Resolve">
                            <CheckCircle2 size={14} />
                          </button>
                          <button style={S.iconButton("#EF4444", "#FEF2F2")} onClick={() => void handleEscalate(dispute)} title="Escalate">
                            <ShieldAlert size={14} />
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
                  <h3 style={{ fontSize: 18, fontWeight: 700 }}>{selectedDispute.title}</h3>
                  <p style={S.mutedLine}>Case: {selectedDispute.disputeCode}</p>
                </div>
              </div>
              <button style={S.closeButton} onClick={() => setSelectedDispute(null)}>x</button>
            </div>

            <div style={S.detailsGrid}>
              <Detail label="Status" value={selectedDispute.status} />
              <Detail label="Priority" value={selectedDispute.priority} />
              <Detail label="Case Code" value={selectedDispute.disputeCode} />
              <Detail label="Firestore ID" value={selectedDispute.id} />
              <Detail label="Loan ID" value={selectedDispute.loanId} />
              <Detail label="Transaction ID" value={selectedDispute.transactionId} />
              <Detail label="Raised By" value={selectedDispute.raisedBy} />
              <Detail label="Against User" value={selectedDispute.againstUser} />
              <Detail label="Disputed Amount" value={selectedDispute.disputedAmount} />
              <Detail label="Created" value={selectedDispute.createdAt} />
              <Detail label="Resolution" value={selectedDispute.resolution} />
              <Detail label="Escalation Reason" value={selectedDispute.escalationReason} />
              <Detail label="Notes" value={selectedDispute.notes} />
              <Detail
                label="Evidence"
                value={selectedDispute.evidenceUrls.length ? selectedDispute.evidenceUrls.join(", ") : "N/A"}
                wide
              />
              <Detail label="Description" value={selectedDispute.description} wide />
            </div>

            <div style={S.modalActions}>
              {canAct(selectedDispute) && (
                <>
                  <button className="btn-success btn-sm" onClick={() => void handleResolve(selectedDispute)}>
                    Resolve
                  </button>
                  <button className="btn-danger btn-sm" onClick={() => void handleEscalate(selectedDispute)}>
                    Escalate
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

function Detail({ label, value, wide = false }: { label: string; value: string; wide?: boolean }) {
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
  },
  iconButton: (color: string, bg: string) => ({
    width: 30,
    height: 30,
    borderRadius: 6,
    border: "none",
    background: bg,
    color,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    cursor: "pointer",
  }),
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
    zIndex: 1000,
  },
  modal: {
    width: "min(760px, 92vw)",
    background: "#FFFFFF",
    borderRadius: 12,
    padding: 24,
  },
  modalHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
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
} satisfies Record<string, CSSProperties | ((color: string, bg: string) => CSSProperties)>;
