import type { CSSProperties } from "react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Search, Eye, Check, X } from "lucide-react";
import {
  approveKyc,
  getPendingKyc,
  rejectKyc,
  type KycDocument,
} from "../../lib/api";
import { formatFirestoreDate } from "../../lib/admin-format";

type KycStatus = "pending" | "approved" | "rejected";

type KycRow = {
  id: string;
  userId: string;
  fullName: string;
  email: string;
  phone: string;
  documentType: string;
  status: KycStatus;
  submittedAt: string;
  documentUrl?: string;
};

// Converts raw KYC documents into stable rows so table rendering stays simple.
function mapDocument(document: KycDocument): KycRow {
  return {
    id: document.id,
    userId: document.userId,
    fullName: document.fullName || "Unknown user",
    email: document.email || "N/A",
    phone: document.phone || "N/A",
    documentType: document.documentType,
    status: document.status,
    submittedAt: formatFirestoreDate(document.submittedAt),
    documentUrl: document.documentUrl,
  };
}

// Centralizes status styling so review states are easy to scan.
function StatusBadge({ status }: { status: KycStatus }) {
  const className = {
    pending: "badge badge-warning",
    approved: "badge badge-success",
    rejected: "badge badge-danger",
  }[status];

  return <span className={className}>{status}</span>;
}

function iconButton(color: string, bg: string): CSSProperties {
  return {
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
  };
}

// Keeps KYC review state and moderation actions together on one page.
// Renders the admin KYC review queue and moderation actions.
export default function KYCApprovals() {
  const [records, setRecords] = useState<KycRow[]>([]);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState<KycStatus | "all">("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedRecord, setSelectedRecord] = useState<KycRow | null>(null);

  const loadKyc = useCallback(async () => {
    try {
      const response = await getPendingKyc();
      setRecords(response.documents.map(mapDocument));
      setError("");
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to load KYC records.",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // Loads the latest review queue before the admin starts taking actions.
    void loadKyc();
  }, [loadKyc]);

  useEffect(() => {
    const interval = window.setInterval(() => {
      void loadKyc();
    }, 10000);

    return () => window.clearInterval(interval);
  }, [loadKyc]);

  const filtered = useMemo(() => {
    return records.filter((record) => {
      const searchValue = search.toLowerCase();
      const matchesSearch =
        record.userId.toLowerCase().includes(searchValue) ||
        record.fullName.toLowerCase().includes(searchValue) ||
        record.email.toLowerCase().includes(searchValue) ||
        record.id.toLowerCase().includes(searchValue) ||
        record.documentType.toLowerCase().includes(searchValue);
      const matchesStatus =
        filterStatus === "all" || record.status === filterStatus;
      return matchesSearch && matchesStatus;
    });
  }, [filterStatus, records, search]);

  const counts = {
    all: records.length,
    pending: records.filter((record) => record.status === "pending").length,
    approved: records.filter((record) => record.status === "approved").length,
    rejected: records.filter((record) => record.status === "rejected").length,
  };

  // Mirrors an approval in local state to avoid an extra full reload.
  async function handleApprove(id: string) {
    try {
      await approveKyc(id);
      setRecords((prev) =>
        prev.map((record) =>
          record.id === id ? { ...record, status: "approved" } : record,
        ),
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to approve KYC.");
    }
  }

  // Mirrors a rejection in local state to avoid an extra full reload.
  async function handleReject(id: string) {
    try {
      await rejectKyc(id);
      setRecords((prev) =>
        prev.map((record) =>
          record.id === id ? { ...record, status: "rejected" } : record,
        ),
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to reject KYC.");
    }
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">KYC Approvals</h1>
          <p className="page-subtitle">
            KYC status is sourced from Firestore user profiles
          </p>
        </div>
        <span style={S.pendingChip}>{counts.pending} Pending</span>
      </div>

      {error && (
        <div className="card" style={S.errorCard}>
          {error}
        </div>
      )}

      <div style={S.summaryGrid}>
        {[
          {
            label: "Total",
            count: counts.all,
            color: "#007AFF",
            bg: "#EFF6FF",
          },
          {
            label: "Pending",
            count: counts.pending,
            color: "#F59E0B",
            bg: "#FFFBEB",
          },
          {
            label: "Approved",
            count: counts.approved,
            color: "#10B981",
            bg: "#ECFDF5",
          },
          {
            label: "Rejected",
            count: counts.rejected,
            color: "#EF4444",
            bg: "#FEF2F2",
          },
        ].map((item) => (
          <div key={item.label} className="card" style={S.summaryCard}>
            <p style={{ fontSize: 13, color: "#6B7280", fontWeight: 500 }}>
              {item.label}
            </p>
            <p
              style={{
                fontSize: 28,
                fontWeight: 700,
                color: item.color,
                marginTop: 4,
              }}
            >
              {loading ? "..." : item.count}
            </p>
          </div>
        ))}
      </div>

      <div style={S.filtersRow}>
        <div style={{ position: "relative", flex: 1, maxWidth: 320 }}>
          <Search size={15} style={S.searchIcon} />
          <input
            className="input"
            placeholder="Search by user, email, document type or record ID..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ paddingLeft: 36 }}
          />
        </div>

        <div className="tabs">
          {(["all", "pending", "approved", "rejected"] as const).map(
            (status) => (
              <button
                key={status}
                className={`tab ${filterStatus === status ? "active" : ""}`}
                onClick={() => setFilterStatus(status)}
              >
                {status}
              </button>
            ),
          )}
        </div>
      </div>

      <div className="table-container">
        <table>
          <thead>
            <tr>
              <th>User</th>
              <th>User ID</th>
              <th>Contact</th>
              <th>Submitted</th>
              <th>Status</th>
              <th style={{ textAlign: "center" }}>Action</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={6} style={S.emptyCell}>
                  {loading ? "Loading KYC records..." : "No records found."}
                </td>
              </tr>
            ) : (
              filtered.map((record) => (
                <tr key={record.id}>
                  <td>
                    <div
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        gap: 2,
                      }}
                    >
                      <span style={{ fontWeight: 600 }}>{record.fullName}</span>
                      <span style={{ fontSize: 12, color: "#6B7280" }}>
                        {record.documentType}
                      </span>
                    </div>
                  </td>
                  <td style={S.monoCell}>{record.userId}</td>
                  <td>
                    <div
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        gap: 2,
                      }}
                    >
                      <span>{record.email}</span>
                      <span style={{ fontSize: 12, color: "#6B7280" }}>
                        {record.phone}
                      </span>
                    </div>
                  </td>
                  <td>{record.submittedAt}</td>
                  <td>
                    <StatusBadge status={record.status} />
                  </td>
                  <td>
                    <div style={S.actionRow}>
                      <button
                        style={iconButton("#6B7280", "#F3F4F6")}
                        onClick={() => setSelectedRecord(record)}
                        title="View"
                      >
                        <Eye size={14} />
                      </button>
                      {record.status === "pending" && (
                        <>
                          <button
                            style={iconButton("#10B981", "#ECFDF5")}
                            onClick={() => void handleApprove(record.id)}
                            title="Approve"
                          >
                            <Check size={14} />
                          </button>
                          <button
                            style={iconButton("#EF4444", "#FEF2F2")}
                            onClick={() => void handleReject(record.id)}
                            title="Reject"
                          >
                            <X size={14} />
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

      {selectedRecord && (
        <div style={S.modalOverlay} onClick={() => setSelectedRecord(null)}>
          <div style={S.modal} onClick={(e) => e.stopPropagation()}>
            <div style={S.modalHeader}>
              <h3 style={{ fontSize: 18, fontWeight: 700 }}>KYC Submission</h3>
              <button
                style={S.closeButton}
                onClick={() => setSelectedRecord(null)}
              >
                ×
              </button>
            </div>
            <div style={S.detailCard}>
              <Detail label="Record ID" value={selectedRecord.id} />
              <Detail label="Full Name" value={selectedRecord.fullName} />
              <Detail label="User ID" value={selectedRecord.userId} />
              <Detail label="Email" value={selectedRecord.email} />
              <Detail label="Phone" value={selectedRecord.phone} />
              <Detail
                label="Document Type"
                value={selectedRecord.documentType}
              />
              <Detail label="Status" value={selectedRecord.status} />
              <Detail label="Submitted At" value={selectedRecord.submittedAt} />
              <Detail
                label="Document URL"
                value={selectedRecord.documentUrl || "Not available"}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Reuses one field renderer so the modal layout stays consistent.
function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div style={{ fontSize: 12, color: "#6B7280", marginBottom: 4 }}>
        {label}
      </div>
      <div
        style={{
          fontSize: 14,
          fontWeight: 600,
          color: "#111827",
          wordBreak: "break-word",
        }}
      >
        {value}
      </div>
    </div>
  );
}

const S: Record<string, CSSProperties> = {
  pendingChip: {
    background: "#FEF3C7",
    color: "#92400E",
    borderRadius: 20,
    padding: "4px 12px",
    fontSize: 13,
    fontWeight: 600,
  },
  errorCard: {
    marginBottom: 16,
    color: "#991B1B",
    background: "#FEF2F2",
    border: "1px solid #FECACA",
  },
  summaryGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(4, 1fr)",
    gap: 16,
    marginBottom: 24,
  },
  summaryCard: {
    display: "flex",
    flexDirection: "column",
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
  emptyCell: {
    textAlign: "center",
    padding: 40,
    color: "#6B7280",
  },
  monoCell: {
    fontFamily: "monospace",
    fontSize: 12,
    color: "#6B7280",
  },
  actionRow: {
    display: "flex",
    gap: 6,
    justifyContent: "center",
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
    width: "min(620px, 92vw)",
    background: "#FFFFFF",
    borderRadius: 18,
    padding: 24,
  },
  modalHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  closeButton: {
    border: "none",
    background: "transparent",
    fontSize: 24,
    cursor: "pointer",
    color: "#6B7280",
  },
  detailCard: {
    display: "grid",
    gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
    gap: 12,
    background: "#F8FAFC",
    border: "1px solid #E2E8F0",
    borderRadius: 12,
    padding: 16,
  },
};
