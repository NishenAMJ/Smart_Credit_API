import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type CSSProperties,
} from "react";
import { Check, Eye, RefreshCw, Search, X } from "lucide-react";
import {
  approveKyc,
  getKycDocumentAccess,
  getPendingKyc,
  rejectKyc,
  type KycDocument,
} from "../../lib/api";
import { subscribeToAdminChanges } from "../../lib/admin-realtime";
import { formatFirestoreDate } from "../../lib/admin-format";

type KycRow = {
  id: string;
  userId: string;
  fullName: string;
  email: string;
  phone: string;
  role: string;
  address?: {
    line1: string;
    line2?: string;
    city: string;
    district: string;
    province: string;
  };
  identityDetails: {
    documentType: string;
    documentNumber: string;
    fullName: string;
    issuingCountry?: string;
    expiryDate?: string;
  };
  location?: {
    latitude: number;
    longitude: number;
    city?: string;
    district?: string;
    visibility: "hidden" | "approximate" | "exact";
    updatedAt?: unknown;
  };
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

type KycSubmissionRow = {
  userId: string;
  fullName: string;
  email: string;
  phone: string;
  role: string;
  address?: KycRow["address"];
  identityDetails: KycRow["identityDetails"];
  location?: KycRow["location"];
  uploadedAt: string;
  status: KycRow["status"];
  userKycStatus: string;
  documents: KycRow[];
};

function mapDocument(document: KycDocument): KycRow {
  return {
    id: document.id,
    userId: document.userId,
    fullName:
      document.applicant?.fullName || document.fullName || "Unknown user",
    email: document.applicant?.email || document.email || "Not provided",
    phone: document.applicant?.phone || document.phone || "Not provided",
    role: document.applicant?.role || "Not provided",
    address: document.applicant?.address,
    identityDetails: document.identityDetails ?? {
      documentType: "Not provided",
      documentNumber: "Not provided",
      fullName: "Not provided",
    },
    location: document.location,
    documentType: document.documentType,
    originalFilename: document.originalFilename || "Unknown file",
    status: document.status,
    uploadedAt: formatFirestoreDate(document.submittedAt),
    userKycStatus: document.userKycStatus || document.status,
    reviewedAt: formatFirestoreDate(
      document.reviewTimestamp || document.reviewedAt,
    ),
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

function formatAddress(address?: KycRow["address"]) {
  if (!address) return "Not provided";
  return [
    address.line1,
    address.line2,
    address.city,
    address.district,
    address.province,
  ]
    .filter(Boolean)
    .join(", ");
}

function normalizeComparableName(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]/g, "");
}

export default function KYCApprovals() {
  const [records, setRecords] = useState<KycRow[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [summary, setSummary] = useState({
    total: 0,
    pending: 0,
    approved: 0,
    rejected: 0,
  });
  const [busyId, setBusyId] = useState<string | null>(null);
  const [selectedRecord, setSelectedRecord] = useState<KycRow | null>(null);
  const [selectedSubmission, setSelectedSubmission] =
    useState<KycSubmissionRow | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState("");
  const [previewError, setPreviewError] = useState("");

  const loadKyc = useCallback(async () => {
    setRefreshing(true);
    try {
      const response = await getPendingKyc({ limit: 100 });
      setRecords(response.documents.map(mapDocument));
      setSummary(response.summary);
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
  }, [loadKyc]);

  useEffect(
    () => subscribeToAdminChanges(["kyc"], () => void loadKyc()),
    [loadKyc],
  );

  const submissions = useMemo(() => {
    const grouped = new Map<string, KycRow[]>();
    records.forEach((record) => {
      grouped.set(record.userId, [
        ...(grouped.get(record.userId) ?? []),
        record,
      ]);
    });

    return [...grouped.entries()].map(([userId, documents]) => {
      const first = documents[0];
      return {
        userId,
        fullName: first.fullName,
        email: first.email,
        phone: first.phone,
        role: first.role,
        address: first.address,
        identityDetails: first.identityDetails,
        location: first.location,
        uploadedAt: first.uploadedAt,
        status: first.status,
        userKycStatus: first.userKycStatus,
        documents,
      } satisfies KycSubmissionRow;
    });
  }, [records]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return submissions.filter((submission) =>
      [
        submission.fullName,
        submission.userId,
        submission.email,
        submission.phone,
        submission.role,
        submission.identityDetails.fullName,
        submission.identityDetails.documentNumber,
        submission.address?.line1,
        submission.address?.city,
        submission.address?.district,
        submission.userKycStatus,
        ...submission.documents.flatMap((document) => [
          document.documentType,
          document.originalFilename,
          document.id,
        ]),
      ]
        .join(" ")
        .toLowerCase()
        .includes(q),
    );
  }, [search, submissions]);

  async function openPreview(record: KycRow, submission?: KycSubmissionRow) {
    if (submission) setSelectedSubmission(submission);
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
      setSelectedSubmission(null);
      setPreviewUrl("");
    }
  }

  async function handleApprove(submission: KycSubmissionRow) {
    const record = submission.documents[0];
    if (
      !window.confirm(
        `Approve the complete KYC submission for ${record.fullName}? All pending documents in this submission will be approved.`,
      )
    ) {
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

  async function handleReject(submission: KycSubmissionRow) {
    const record = submission.documents[0];
    const reason = window.prompt("Enter a rejection reason or note:");
    if (!reason || !reason.trim()) {
      return;
    }

    if (
      !window.confirm(
        `Reject the complete KYC submission for ${record.fullName}? All pending documents in this submission will be rejected.`,
      )
    ) {
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
            Review each user's complete KYC submission and inspect every file
            through a secure preview before making a decision.
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
          { label: "Total", value: summary.total, color: "#2563EB" },
          { label: "Pending", value: summary.pending, color: "#D97706" },
          { label: "Approved", value: summary.approved, color: "#059669" },
          { label: "Rejected", value: summary.rejected, color: "#DC2626" },
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
              <th>Submission</th>
              <th>Uploaded</th>
              <th>Current Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={5} style={S.emptyCell}>
                  {loading
                    ? "Loading pending KYC documents..."
                    : "No documents found."}
                </td>
              </tr>
            ) : (
              filtered.map((submission) => (
                <tr key={submission.userId}>
                  <td>
                    <div style={S.cellStack}>
                      <strong>{submission.fullName}</strong>
                      <span style={S.mutedText}>{submission.userId}</span>
                      <span style={S.mutedText}>{submission.email}</span>
                      <span style={S.mutedText}>{submission.phone}</span>
                    </div>
                  </td>
                  <td>
                    <div style={S.cellStack}>
                      <span>{submission.documents.length} documents</span>
                      <span style={S.mutedText}>
                        {submission.documents
                          .map((document) => formatLabel(document.documentType))
                          .join(", ")}
                      </span>
                    </div>
                  </td>
                  <td>{submission.uploadedAt}</td>
                  <td>
                    <div style={S.cellStack}>
                      <span className={statusClass(submission.status)}>
                        {submission.status}
                      </span>
                      <span style={S.mutedText}>
                        User: {submission.userKycStatus}
                      </span>
                    </div>
                  </td>
                  <td>
                    <div style={S.actionRow}>
                      <button
                        className="btn btn-secondary"
                        onClick={() =>
                          void openPreview(submission.documents[0], submission)
                        }
                        disabled={busyId === submission.documents[0].id}
                      >
                        <Eye size={14} style={{ marginRight: 6 }} />
                        View
                      </button>
                      {submission.status === "pending" && (
                        <>
                          <button
                            className="btn btn-success"
                            onClick={() => void handleApprove(submission)}
                            disabled={busyId === submission.documents[0].id}
                          >
                            <Check size={14} style={{ marginRight: 6 }} />
                            Approve
                          </button>
                          <button
                            className="btn btn-danger"
                            onClick={() => void handleReject(submission)}
                            disabled={busyId === submission.documents[0].id}
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
        <div
          style={S.modalOverlay}
          onClick={() => {
            setSelectedRecord(null);
            setSelectedSubmission(null);
          }}
        >
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
                onClick={() => {
                  setSelectedRecord(null);
                  setSelectedSubmission(null);
                }}
              >
                Close
              </button>
            </div>

            {selectedSubmission && (
              <div style={S.documentTabs}>
                {selectedSubmission.documents.map((document) => (
                  <button
                    key={document.id}
                    className={
                      document.id === selectedRecord.id
                        ? "btn btn-primary"
                        : "btn btn-secondary"
                    }
                    onClick={() => void openPreview(document)}
                  >
                    {formatLabel(document.documentType)}
                  </button>
                ))}
              </div>
            )}

            {selectedSubmission && (
              <div style={S.reviewSections}>
                {selectedSubmission.identityDetails.fullName !==
                  "Not provided" &&
                normalizeComparableName(selectedSubmission.fullName) !==
                  normalizeComparableName(
                    selectedSubmission.identityDetails.fullName,
                  ) ? (
                  <div style={S.mismatchAlert} role="alert">
                    <strong>Names require attention</strong>
                    <span>
                      The account name and name entered from the identity
                      document do not match exactly. Compare both against the
                      uploaded files before deciding.
                    </span>
                  </div>
                ) : null}

                <section style={S.reviewSection}>
                  <div style={S.reviewSectionHeader}>
                    <div>
                      <h4 style={S.reviewSectionTitle}>Account information</h4>
                      <p style={S.reviewSectionCopy}>
                        Details entered when this account was created.
                      </p>
                    </div>
                    <span style={S.reviewSectionTag}>User input</span>
                  </div>
                  <div style={S.detailGrid}>
                    <Detail
                      label="Account name"
                      value={selectedSubmission.fullName}
                    />
                    <Detail
                      label="Role"
                      value={formatLabel(selectedSubmission.role)}
                    />
                    <Detail label="Email" value={selectedSubmission.email} />
                    <Detail label="Phone" value={selectedSubmission.phone} />
                  </div>
                </section>

                <section style={S.reviewSection}>
                  <div style={S.reviewSectionHeader}>
                    <div>
                      <h4 style={S.reviewSectionTitle}>Identity details</h4>
                      <p style={S.reviewSectionCopy}>
                        Values supplied by the applicant for document review.
                      </p>
                    </div>
                    <span style={S.reviewSectionTag}>Compare with files</span>
                  </div>
                  <div style={S.detailGrid}>
                    <Detail
                      label="Name on identity document"
                      value={selectedSubmission.identityDetails.fullName}
                    />
                    <Detail
                      label="Identity document type"
                      value={formatLabel(
                        selectedSubmission.identityDetails.documentType,
                      )}
                    />
                    <Detail
                      label="Document number"
                      value={selectedSubmission.identityDetails.documentNumber}
                    />
                    <Detail
                      label="Issuing country"
                      value={
                        selectedSubmission.identityDetails.issuingCountry ||
                        "Not provided"
                      }
                    />
                    <Detail
                      label="Expiry date"
                      value={
                        selectedSubmission.identityDetails.expiryDate ||
                        "Not provided"
                      }
                    />
                  </div>
                </section>

                <section style={S.reviewSection}>
                  <div style={S.reviewSectionHeader}>
                    <div>
                      <h4 style={S.reviewSectionTitle}>
                        Registered address and location
                      </h4>
                      <p style={S.reviewSectionCopy}>
                        Address is required; GPS remains permission-based.
                      </p>
                    </div>
                    <span style={S.reviewSectionTag}>Location</span>
                  </div>
                  <div style={S.detailGrid}>
                    <Detail
                      label="Registered address"
                      value={formatAddress(selectedSubmission.address)}
                    />
                    <Detail
                      label="Map visibility"
                      value={
                        selectedSubmission.location
                          ? formatLabel(selectedSubmission.location.visibility)
                          : "Not shared"
                      }
                    />
                    <Detail
                      label="Coordinates"
                      value={
                        selectedSubmission.location
                          ? `${selectedSubmission.location.latitude.toFixed(6)}, ${selectedSubmission.location.longitude.toFixed(6)}`
                          : "Not provided"
                      }
                    />
                    <Detail
                      label="Location updated"
                      value={
                        selectedSubmission.location?.updatedAt
                          ? formatFirestoreDate(
                              selectedSubmission.location.updatedAt,
                            )
                          : "Not provided"
                      }
                    />
                  </div>
                  {selectedSubmission.location ? (
                    <a
                      href={`https://www.google.com/maps?q=${selectedSubmission.location.latitude},${selectedSubmission.location.longitude}`}
                      target="_blank"
                      rel="noreferrer"
                      style={S.mapLink}
                    >
                      Open location in Google Maps
                    </a>
                  ) : (
                    <p style={S.locationNotice}>
                      This user has not granted location permission yet and will
                      not appear on maps until a location is saved.
                    </p>
                  )}
                </section>
              </div>
            )}

            <div style={S.detailGrid}>
              <Detail label="User" value={selectedRecord.fullName} />
              <Detail label="User ID" value={selectedRecord.userId} />
              <Detail
                label="Document Type"
                value={formatLabel(selectedRecord.documentType)}
              />
              <Detail
                label="File Name"
                value={selectedRecord.originalFilename}
              />
              <Detail label="Uploaded" value={selectedRecord.uploadedAt} />
              <Detail label="Current Status" value={selectedRecord.status} />
              <Detail
                label="User KYC Status"
                value={selectedRecord.userKycStatus}
              />
              <Detail
                label="Reviewer"
                value={selectedRecord.reviewerId || "-"}
              />
              <Detail
                label="Reviewed At"
                value={selectedRecord.reviewedAt || "-"}
              />
              <Detail
                label="Notes"
                value={
                  selectedRecord.reviewNotes ||
                  selectedRecord.rejectionReason ||
                  "-"
                }
              />
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

      {refreshing && (
        <div style={S.refreshHint}>Refreshing review queue...</div>
      )}
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
  documentTabs: {
    display: "flex",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 16,
  },
  reviewSections: {
    display: "grid",
    gap: 16,
    marginBottom: 18,
  },
  reviewSection: {
    border: "1px solid #DCE6F1",
    borderRadius: 16,
    padding: 16,
    background: "#FFFFFF",
  },
  reviewSectionHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 16,
    marginBottom: 14,
  },
  reviewSectionTitle: {
    margin: 0,
    color: "#0F172A",
    fontSize: 16,
    fontWeight: 700,
  },
  reviewSectionCopy: {
    margin: "4px 0 0",
    color: "#64748B",
    fontSize: 13,
  },
  reviewSectionTag: {
    borderRadius: 999,
    padding: "5px 9px",
    background: "#EAF2FF",
    color: "#1D4ED8",
    fontSize: 11,
    fontWeight: 700,
    whiteSpace: "nowrap",
  },
  mismatchAlert: {
    display: "flex",
    flexDirection: "column",
    gap: 4,
    border: "1px solid #F59E0B",
    borderRadius: 14,
    padding: 14,
    background: "#FFFBEB",
    color: "#92400E",
    fontSize: 13,
  },
  mapLink: {
    display: "inline-flex",
    marginTop: 2,
    color: "#2563EB",
    fontSize: 13,
    fontWeight: 700,
    textDecoration: "none",
  },
  locationNotice: {
    margin: 0,
    color: "#92400E",
    fontSize: 13,
    lineHeight: 1.5,
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
