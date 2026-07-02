import { useCallback, useEffect, useMemo, useState, type CSSProperties } from "react";
import { Check, Eye, RefreshCw, Search, X } from "lucide-react";
import {
  approveKyc,
  getKycDocumentAccess,
  getPendingKyc,
  rejectKyc,
  type KycDocument,
} from "../../lib/api";
import { formatFirestoreDate } from "../../lib/admin-format";

type KycRow = {
  id: string;
  userId: string;
  fullName: string;
  email: string;
  phone: string;
  documentType: string;
  originalFilename: string;
  status: "pending" | "approved" | "rejected";
  uploadedAt: string;
  userKycStatus: string;
  reviewedAt?: string;
  reviewerId?: string;
  reviewNotes?: string;
  rejectionReason?: string;
  accessUrl?: string;
};

function mapDocument(document: KycDocument): KycRow {
  return {
    id: document.id,
    userId: document.userId,
    fullName: document.fullName || "Unknown user",
    email: document.email || "N/A",
    phone: document.phone || "N/A",
    documentType: document.documentType,
    originalFilename: document.originalFilename || "Unknown file",
    status: document.status,
    uploadedAt: formatFirestoreDate(document.submittedAt),
    userKycStatus: document.userKycStatus || document.status,
    reviewedAt: formatFirestoreDate(document.reviewTimestamp || document.reviewedAt),
    reviewerId: document.reviewerId || document.reviewedBy,
    reviewNotes: document.reviewNotes || document.notes || "",
    rejectionReason: document.rejectionReason || "",
  };
}

function statusClass(status: KycRow["status"]) {
  return {
    pending: "badge badge-warning",
    approved: "badge badge-success",
    rejected: "badge badge-danger",
  }[status];
}

function formatLabel(value: string) {
  return value.replace(/_/g, " ");
}

export default function KYCApprovals() {
  const [records, setRecords] = useState<KycRow[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [selectedRecord, setSelectedRecord] = useState<KycRow | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState("");
  const [previewError, setPreviewError] = useState("");

  const loadKyc = useCallback(async () => {
    setRefreshing(true);
    try {
      const response = await getPendingKyc({ limit: 100 });
      setRecords(response.documents.map(mapDocument));
      setError("");
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to load KYC records.",
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void loadKyc();
    const interval = window.setInterval(() => {
      void loadKyc();
    }, 15000);

    return () => window.clearInterval(interval);
  }, [loadKyc]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return records.filter((record) =>
      [
        record.fullName,
        record.userId,
        record.email,
        record.phone,
        record.documentType,
        record.originalFilename,
        record.id,
        record.userKycStatus,
      ]
        .join(" ")
        .toLowerCase()
        .includes(q),
    );
  }, [records, search]);

  const counts = useMemo(
    () => ({
      total: records.length,
      pending: records.filter((record) => record.status === "pending").length,
      approved: records.filter((record) => record.status === "approved").length,
      rejected: records.filter((record) => record.status === "rejected").length,
    }),
    [records],
  );

  async function openPreview(record: KycRow) {
    setSelectedRecord(record);
    setPreviewUrl("");
    setPreviewError("");
    setPreviewLoading(true);

    try {
      const response = await getKycDocumentAccess(record.id);
      setPreviewUrl(response.accessUrl);
    } catch (err) {
      setPreviewError(
        err instanceof Error ? err.message : "Failed to fetch signed URL.",
      );
    } finally {
      setPreviewLoading(false);
    }
  }

  async function refreshAfterAction(documentId: string) {
    await loadKyc();
    if (selectedRecord?.id === documentId) {
      setSelectedRecord(null);
      setPreviewUrl("");
    }
  }

  async function handleApprove(record: KycRow) {
    if (!window.confirm(`Approve KYC document for ${record.fullName}?`)) {
      return;
    }

    setBusyId(record.id);
    try {
      await approveKyc(record.id);
      await refreshAfterAction(record.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to approve KYC.");
    } finally {
      setBusyId(null);
    }
  }

  async function handleReject(record: KycRow) {
    const reason = window.prompt("Enter a rejection reason or note:");
    if (!reason || !reason.trim()) {
      return;
    }

    if (!window.confirm(`Reject KYC document for ${record.fullName}?`)) {
      return;
    }

    setBusyId(record.id);
    try {
      await rejectKyc(record.id, reason.trim());
      await refreshAfterAction(record.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to reject KYC.");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">KYC Reviews</h1>
          <p className="page-subtitle">
            Review pending KYC documents, open secure Cloudinary previews, and
            approve or reject submissions.
          </p>
        </div>
        <button className="btn btn-secondary" onClick={() => void loadKyc()}>
          <RefreshCw size={14} style={{ marginRight: 6 }} />
          Refresh
        </button>
      </div>

      {error && (
        <div className="card" style={S.errorCard}>
          {error}
        </div>
      )}

      <div style={S.summaryGrid}>
        {[
          { label: "Total", value: counts.total, color: "#2563EB" },
          { label: "Pending", value: counts.pending, color: "#D97706" },
          { label: "Approved", value: counts.approved, color: "#059669" },
          { label: "Rejected", value: counts.rejected, color: "#DC2626" },
        ].map((item) => (
          <div key={item.label} className="card" style={S.summaryCard}>
            <p style={{ color: "#6B7280", fontSize: 13 }}>{item.label}</p>
            <p style={{ color: item.color, fontSize: 28, fontWeight: 700 }}>
              {loading ? "..." : item.value}
            </p>
          </div>
        ))}
      </div>

      <div style={S.searchRow}>
        <div style={S.searchWrap}>
          <Search size={15} style={S.searchIcon} />
          <input
            className="input"
            placeholder="Search by user, document, file name, or ID..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={S.searchInput}
          />
        </div>
      </div>

      <div className="table-container">
        <table>
          <thead>
            <tr>
              <th>User</th>
              <th>Document</th>
              <th>Uploaded</th>
              <th>Current Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={5} style={S.emptyCell}>
                  {loading ? "Loading pending KYC documents..." : "No documents found."}
                </td>
              </tr>
            ) : (
              filtered.map((record) => (
                <tr key={record.id}>
                  <td>
                    <div style={S.cellStack}>
                      <strong>{record.fullName}</strong>
                      <span style={S.mutedText}>{record.userId}</span>
                      <span style={S.mutedText}>{record.email}</span>
                      <span style={S.mutedText}>{record.phone}</span>
                    </div>
                  </td>
                  <td>
                    <div style={S.cellStack}>
                      <span>{formatLabel(record.documentType)}</span>
                      <span style={S.mutedText}>{record.originalFilename}</span>
                    </div>
                  </td>
                  <td>{record.uploadedAt}</td>
                  <td>
                    <div style={S.cellStack}>
                      <span className={statusClass(record.status)}>{record.status}</span>
                      <span style={S.mutedText}>User: {record.userKycStatus}</span>
                    </div>
                  </td>
                  <td>
                    <div style={S.actionRow}>
                      <button
                        className="btn btn-secondary"
                        onClick={() => void openPreview(record)}
                        disabled={busyId === record.id}
                      >
                        <Eye size={14} style={{ marginRight: 6 }} />
                        View
                      </button>
                      {record.status === "pending" && (
                        <>
                          <button
                            className="btn btn-success"
                            onClick={() => void handleApprove(record)}
                            disabled={busyId === record.id}
                          >
                            <Check size={14} style={{ marginRight: 6 }} />
                            Approve
                          </button>
                          <button
                            className="btn btn-danger"
                            onClick={() => void handleReject(record)}
                            disabled={busyId === record.id}
                          >
                            <X size={14} style={{ marginRight: 6 }} />
                            Reject
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
              <div>
                <h3 style={S.modalTitle}>Secure KYC Preview</h3>
                <p style={S.modalSubtitle}>
                  {selectedRecord.fullName} • {selectedRecord.originalFilename}
                </p>
              </div>
              <button
                className="btn btn-secondary"
                onClick={() => setSelectedRecord(null)}
              >
                Close
              </button>
            </div>

            <div style={S.detailGrid}>
              <Detail label="User" value={selectedRecord.fullName} />
              <Detail label="User ID" value={selectedRecord.userId} />
              <Detail label="Document Type" value={formatLabel(selectedRecord.documentType)} />
              <Detail label="File Name" value={selectedRecord.originalFilename} />
              <Detail label="Uploaded" value={selectedRecord.uploadedAt} />
              <Detail label="Current Status" value={selectedRecord.status} />
              <Detail label="User KYC Status" value={selectedRecord.userKycStatus} />
              <Detail label="Reviewer" value={selectedRecord.reviewerId || "-"} />
              <Detail label="Reviewed At" value={selectedRecord.reviewedAt || "-"} />
              <Detail label="Notes" value={selectedRecord.reviewNotes || selectedRecord.rejectionReason || "-"} />
            </div>

            <div style={S.previewBox}>
              {previewLoading ? (
                <div style={S.previewState}>Loading secure URL...</div>
              ) : previewError ? (
                <div style={S.previewState}>{previewError}</div>
              ) : previewUrl ? (
                <iframe
                  title="KYC document preview"
                  src={previewUrl}
                  style={S.previewFrame}
                />
              ) : (
                <div style={S.previewState}>
                  Click View to fetch a short-lived signed Cloudinary URL.
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {refreshing && <div style={S.refreshHint}>Refreshing review queue...</div>}
    </div>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div style={S.detailLabel}>{label}</div>
      <div style={S.detailValue}>{value}</div>
    </div>
  );
}

const S: Record<string, CSSProperties> = {
  errorCard: {
    marginBottom: 16,
    color: "#991B1B",
    background: "#FEF2F2",
    border: "1px solid #FECACA",
  },
  summaryGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
    gap: 16,
    marginBottom: 20,
  },
  summaryCard: {
    display: "flex",
    flexDirection: "column",
    gap: 4,
  },
  searchRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 12,
    marginBottom: 16,
  },
  searchWrap: {
    position: "relative",
    flex: 1,
    maxWidth: 420,
  },
  searchIcon: {
    position: "absolute",
    left: 12,
    top: "50%",
    transform: "translateY(-50%)",
    color: "#6B7280",
  },
  searchInput: {
    paddingLeft: 36,
  },
  emptyCell: {
    textAlign: "center",
    padding: 40,
    color: "#6B7280",
  },
  cellStack: {
    display: "flex",
    flexDirection: "column",
    gap: 2,
  },
  mutedText: {
    color: "#6B7280",
    fontSize: 12,
  },
  actionRow: {
    display: "flex",
    gap: 8,
    flexWrap: "wrap",
  },
  modalOverlay: {
    position: "fixed",
    inset: 0,
    background: "rgba(15, 23, 42, 0.55)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 1000,
    padding: 20,
  },
  modal: {
    width: "min(980px, 96vw)",
    maxHeight: "92vh",
    overflow: "auto",
    background: "#FFFFFF",
    borderRadius: 20,
    padding: 24,
    boxShadow: "0 24px 80px rgba(15, 23, 42, 0.32)",
  },
  modalHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 16,
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 700,
    margin: 0,
  },
  modalSubtitle: {
    margin: "4px 0 0",
    color: "#6B7280",
    fontSize: 13,
  },
  detailGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
    gap: 12,
    background: "#F8FAFC",
    border: "1px solid #E2E8F0",
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
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
    wordBreak: "break-word",
  },
  previewBox: {
    border: "1px solid #E2E8F0",
    borderRadius: 16,
    overflow: "hidden",
    minHeight: 420,
    background: "#0F172A",
  },
  previewFrame: {
    width: "100%",
    height: 480,
    border: "none",
    background: "#FFFFFF",
  },
  previewState: {
    minHeight: 420,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    color: "#E2E8F0",
    padding: 24,
    textAlign: "center",
  },
  refreshHint: {
    position: "fixed",
    right: 18,
    bottom: 18,
    background: "#0F172A",
    color: "#FFFFFF",
    borderRadius: 999,
    padding: "10px 14px",
    fontSize: 12,
    boxShadow: "0 10px 30px rgba(15, 23, 42, 0.24)",
  },
};
