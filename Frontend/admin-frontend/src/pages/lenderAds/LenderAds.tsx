import type { CSSProperties } from "react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Search, Eye, Check, X, RotateCcw, ChevronLeft, ChevronRight } from "lucide-react";
import { approveAd, getAds, rejectAd, updateAdStatus, type AdminAd, type AdStatus } from "../../lib/api";
import { formatFirestoreDate } from "../../lib/admin-format";
import { DEFAULT_AD_REJECTION_REASON } from "../../constants/admin-actions";

const PAGE_SIZE_OPTIONS = [10, 20, 50] as const;

type LenderAdRow = {
  id: string;
  lender: string;
  lenderPhotoURL?: string;
  location: string;
  description: string;
  interestRate: string;
  maxAmount: string;
  tenureRange: string;
  preferredPurposes: string;
  status: AdStatus;
  postedDate: string;
};

// Converts backend ads into stable rows so the moderation table stays simple.
function mapAd(ad: AdminAd): LenderAdRow {
  return {
    id: ad.id,
    lender: ad.lenderName || ad.lenderId || "Unknown lender",
    lenderPhotoURL: ad.lenderPhotoURL,
    location: ad.location || "N/A",
    description: `Preferred purposes: ${(ad.preferredPurposes || []).join(", ") || "N/A"}`,
    interestRate:
      typeof ad.preferredInterestRate === "number" ? `${ad.preferredInterestRate}%` : "N/A",
    maxAmount:
      typeof ad.maxAmount === "number" ? `LKR ${ad.maxAmount.toLocaleString()}` : "N/A",
    tenureRange:
      typeof ad.minTenureMonths === "number" && typeof ad.maxTenureMonths === "number"
        ? `${ad.minTenureMonths}-${ad.maxTenureMonths} months`
        : "N/A",
    preferredPurposes: (ad.preferredPurposes || []).join(", ") || "N/A",
    status: ad.status,
    postedDate: formatFirestoreDate(ad.createdAt),
  };
}

// Centralizes status styling so moderation states are easy to scan.
function StatusBadge({ status }: { status: AdStatus }) {
  const className = {
    active: "badge badge-success",
    approved: "badge badge-success",
    pending: "badge badge-warning",
    closed: "badge badge-gray",
    rejected: "badge badge-danger",
  }[status];

  return <span className={className}>{status}</span>;
}

// Keeps ad moderation state and actions together on one screen.
export default function LenderAds() {
  const [ads, setAds] = useState<LenderAdRow[]>([]);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState<AdStatus | "all">("all");
  const [selectedAd, setSelectedAd] = useState<LenderAdRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Pagination state
  const [pageSize, setPageSize] = useState<number>(10);
  const [currentPage, setCurrentPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [nextCursor, setNextCursor] = useState<string | undefined>();
  const [cursorStack, setCursorStack] = useState<string[]>([]);
  const [totalLoaded, setTotalLoaded] = useState(0);

  const loadAds = useCallback(async (cursor?: string) => {
    setLoading(true);
    try {
      const response = await getAds({ limit: pageSize, cursor });
      setAds(response.ads.map(mapAd));
      setHasMore(response.hasMore ?? false);
      setNextCursor(response.nextCursor);
      setTotalLoaded(response.count);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load ads.");
    } finally {
      setLoading(false);
    }
  }, [pageSize]);

  useEffect(() => {
    setCurrentPage(1);
    setCursorStack([]);
    void loadAds();
  }, [loadAds]);

  const filteredAds = useMemo(() => {
    return ads.filter((ad) => {
      const searchValue = search.toLowerCase();
      const matchesSearch =
        ad.lender.toLowerCase().includes(searchValue) ||
        ad.location.toLowerCase().includes(searchValue) ||
        ad.id.toLowerCase().includes(searchValue) ||
        ad.preferredPurposes.toLowerCase().includes(searchValue);
      const matchesStatus = filterStatus === "all" || ad.status === filterStatus;
      return matchesSearch && matchesStatus;
    });
  }, [ads, filterStatus, search]);

  const counts = {
    all: ads.length,
    active: ads.filter((ad) => ad.status === "active").length,
    approved: ads.filter((ad) => ad.status === "approved").length,
    pending: ads.filter((ad) => ad.status === "pending").length,
    rejected: ads.filter((ad) => ad.status === "rejected").length,
    closed: ads.filter((ad) => ad.status === "closed").length,
  };

  function handleNextPage() {
    if (!hasMore || !nextCursor) return;
    setCursorStack((prev) => [...prev, nextCursor]);
    setCurrentPage((prev) => prev + 1);
    void loadAds(nextCursor);
  }

  function handlePrevPage() {
    if (currentPage <= 1) return;
    const newStack = [...cursorStack];
    newStack.pop();
    const prevCursor = newStack.length > 0 ? newStack[newStack.length - 1] : undefined;
    setCursorStack(newStack);
    setCurrentPage((prev) => prev - 1);
    // For cursor-based: go back to the cursor before the current one
    // First page has no cursor, subsequent pages use the previous cursor from stack
    const goToCursor = currentPage <= 2 ? undefined : prevCursor;
    void loadAds(goToCursor);
  }

  function handlePageSizeChange(newSize: number) {
    setPageSize(newSize);
    setCurrentPage(1);
    setCursorStack([]);
  }

  function syncAdStatus(adId: string, status: AdStatus) {
    setAds((prev) => prev.map((ad) => (ad.id === adId ? { ...ad, status } : ad)));
    setSelectedAd((prev) => (prev?.id === adId ? { ...prev, status } : prev));
  }

  // Mirrors an approval in local state to avoid an extra full reload.
  async function handleApprove(adId: string) {
    try {
      await approveAd(adId);
      syncAdStatus(adId, "approved");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to approve ad.");
    }
  }

  // Mirrors a rejection in local state to avoid an extra full reload.
  async function handleReject(adId: string) {
    try {
      await rejectAd(adId);
      syncAdStatus(adId, "rejected");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to reject ad.");
    }
  }

  // Reopens an approved or active ad when it needs another review.
  async function handleMoveToPending(adId: string) {
    try {
      await updateAdStatus(adId, "pending", { notes: "Moved back to pending review by admin" });
      syncAdStatus(adId, "pending");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to move ad to pending.");
    }
  }

  // Rejects an approved or active ad after a later complaint or policy issue.
  async function handleMoveToRejected(adId: string) {
    try {
      await updateAdStatus(adId, "rejected", { reason: DEFAULT_AD_REJECTION_REASON });
      syncAdStatus(adId, "rejected");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to move ad to rejected.");
    }
  }

  function renderActions(ad: LenderAdRow) {
    return (
      <>
        <button style={S.iconButton("#6B7280", "#F3F4F6")} onClick={() => setSelectedAd(ad)} title="View">
          <Eye size={14} />
        </button>
        {ad.status === "pending" && (
          <>
            <button style={S.iconButton("#10B981", "#ECFDF5")} onClick={() => void handleApprove(ad.id)} title="Approve">
              <Check size={14} />
            </button>
            <button style={S.iconButton("#EF4444", "#FEF2F2")} onClick={() => void handleReject(ad.id)} title="Reject">
              <X size={14} />
            </button>
          </>
        )}
        {(ad.status === "approved" || ad.status === "active") && (
          <>
            <button style={S.iconButton("#F59E0B", "#FFFBEB")} onClick={() => void handleMoveToPending(ad.id)} title="Move to pending">
              <RotateCcw size={14} />
            </button>
            <button style={S.iconButton("#EF4444", "#FEF2F2")} onClick={() => void handleMoveToRejected(ad.id)} title="Move to rejected">
              <X size={14} />
            </button>
          </>
        )}
      </>
    );
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Lender Ads</h1>
          <p className="page-subtitle">Only lenders can publish ads. Borrowers choose a lender ad and request a loan from that lender.</p>
        </div>
      </div>

      {error && <div className="card" style={S.errorCard}>{error}</div>}

      <div style={S.summaryGrid}>
        {[
          { label: "All Lender Ads", count: counts.all, color: "#007AFF" },
          { label: "Active", count: counts.active, color: "#10B981" },
          { label: "Approved", count: counts.approved, color: "#10B981" },
          { label: "Pending", count: counts.pending, color: "#F59E0B" },
          { label: "Rejected", count: counts.rejected, color: "#EF4444" },
          { label: "Closed", count: counts.closed, color: "#6B7280" },
        ].map((item) => (
          <div key={item.label} className="card">
            <p style={S.cardLabel}>{item.label}</p>
            <p style={{ ...S.cardValue, color: item.color }}>{loading ? "..." : item.count}</p>
          </div>
        ))}
      </div>

      <div style={S.filtersRow}>
        <div style={{ position: "relative", flex: 1, maxWidth: 320 }}>
          <Search size={15} style={S.searchIcon} />
          <input
            className="input"
            placeholder="Search by lender, title or ID..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ paddingLeft: 36 }}
          />
        </div>

        <div className="tabs">
          {(["all", "active", "approved", "pending", "rejected", "closed"] as const).map((status) => (
            <button key={status} className={`tab ${filterStatus === status ? "active" : ""}`} onClick={() => setFilterStatus(status)}>
              {status}
            </button>
          ))}
        </div>
      </div>

      <div className="table-container">
        <table>
          <thead>
            <tr>
              <th>Lender</th>
              <th>Location</th>
              <th>Interest Rate</th>
              <th>Max Amount</th>
              <th>Tenure</th>
              <th>Posted</th>
              <th>Status</th>
              <th style={{ textAlign: "center" }}>Action</th>
            </tr>
          </thead>
          <tbody>
            {filteredAds.length === 0 ? (
              <tr>
                <td colSpan={8} style={S.emptyCell}>
                  {loading ? "Loading ads..." : "No ads found."}
                </td>
              </tr>
            ) : (
              filteredAds.map((ad) => (
                <tr key={ad.id}>
                  <td>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <LenderAvatar name={ad.lender} photoURL={ad.lenderPhotoURL} size={34} />
                      <div>
                        <p style={{ fontWeight: 600 }}>{ad.lender}</p>
                        <p style={{ fontSize: 12, color: "#6B7280" }}>Lender ad</p>
                      </div>
                    </div>
                  </td>
                  <td>
                    <div style={{ maxWidth: 220 }}>
                      <p style={{ fontWeight: 600 }}>{ad.location}</p>
                      <p style={{ fontSize: 12, color: "#6B7280" }}>{ad.preferredPurposes}</p>
                    </div>
                  </td>
                  <td>{ad.interestRate}</td>
                  <td>{ad.maxAmount}</td>
                  <td>{ad.tenureRange}</td>
                  <td>{ad.postedDate}</td>
                  <td><StatusBadge status={ad.status} /></td>
                  <td>
                    <div style={S.actionRow}>
                      {renderActions(ad)}
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
              Showing {filteredAds.length > 0 ? (currentPage - 1) * pageSize + 1 : 0}
              –{(currentPage - 1) * pageSize + totalLoaded} {hasMore ? "" : "(last page)"}
            </span>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <label style={{ fontSize: 13, color: "#6B7280" }}>Rows:</label>
              <select
                value={pageSize}
                onChange={(e) => handlePageSizeChange(Number(e.target.value))}
                style={S.pageSizeSelect}
              >
                {PAGE_SIZE_OPTIONS.map((size) => (
                  <option key={size} value={size}>{size}</option>
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

      {selectedAd && (
        <div style={S.modalOverlay} onClick={() => setSelectedAd(null)}>
          <div style={S.modal} onClick={(e) => e.stopPropagation()}>
            <div style={S.modalHeader}>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <LenderAvatar name={selectedAd.lender} photoURL={selectedAd.lenderPhotoURL} size={48} />
                <div>
                  <h3 style={{ fontSize: 18, fontWeight: 700 }}>{selectedAd.lender}</h3>
                  <p style={{ fontSize: 12, color: "#6B7280" }}>{selectedAd.id}</p>
                </div>
              </div>
              <button style={S.closeButton} onClick={() => setSelectedAd(null)}>×</button>
            </div>

            <div style={S.profilePreview}>
              <LenderAvatar name={selectedAd.lender} photoURL={selectedAd.lenderPhotoURL} size={96} />
              <div>
                <p style={S.profileLabel}>Lender Profile Picture</p>
                <p style={S.profileName}>{selectedAd.lender}</p>
              </div>
            </div>

            <div style={S.detailsGrid}>
              <Detail label="Lender" value={selectedAd.lender} />
              <Detail label="Location" value={selectedAd.location} />
              <Detail label="Interest Rate" value={selectedAd.interestRate} />
              <Detail label="Amount" value={selectedAd.maxAmount} />
              <Detail label="Tenure Range" value={selectedAd.tenureRange} />
              <Detail label="Preferred Purposes" value={selectedAd.preferredPurposes} />
              <Detail label="Posted Date" value={selectedAd.postedDate} />
              <Detail label="Status" value={selectedAd.status} />
              <Detail label="Description" value={selectedAd.description} />
            </div>
            <div style={S.modalActions}>
              {renderActions(selectedAd)}
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
    <div style={S.detailCard}>
      <div style={{ fontSize: 12, color: "#6B7280", marginBottom: 4 }}>{label}</div>
      <div style={{ fontSize: 14, fontWeight: 600, color: "#111827" }}>{value}</div>
    </div>
  );
}

function LenderAvatar({
  name,
  photoURL,
  size,
}: {
  name: string;
  photoURL?: string;
  size: number;
}) {
  const [imageFailed, setImageFailed] = useState(false);
  const initials = name.slice(0, 2).toUpperCase();
  const avatarStyle: CSSProperties = { ...S.avatar, width: size, height: size };

  if (photoURL && !imageFailed) {
    return (
      <img
        src={photoURL}
        alt={`${name} profile`}
        style={{ ...avatarStyle, objectFit: "cover" }}
        onError={() => setImageFailed(true)}
      />
    );
  }

  return <div style={avatarStyle}>{initials}</div>;
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
    gridTemplateColumns: "repeat(4, 1fr)",
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
  emptyCell: {
    textAlign: "center",
    padding: 40,
    color: "#6B7280",
  },
  avatar: {
    width: 34,
    height: 34,
    borderRadius: "50%",
    background: "#EFF6FF",
    color: "#007AFF",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: 12,
    fontWeight: 700,
    flexShrink: 0,
  },
  actionRow: {
    display: "flex",
    gap: 6,
    justifyContent: "center",
  },
  modalActions: {
    display: "flex",
    justifyContent: "flex-end",
    gap: 8,
    marginTop: 16,
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
    width: "min(700px, 92vw)",
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
  bigIcon: {
    width: 42,
    height: 42,
    borderRadius: 12,
    background: "#EFF6FF",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  closeButton: {
    border: "none",
    background: "transparent",
    fontSize: 24,
    cursor: "pointer",
    color: "#6B7280",
  },
  profilePreview: {
    display: "flex",
    alignItems: "center",
    gap: 16,
    padding: 16,
    background: "#F8FAFC",
    border: "1px solid #E2E8F0",
    borderRadius: 12,
    marginBottom: 16,
  },
  profileLabel: {
    fontSize: 12,
    color: "#6B7280",
    fontWeight: 600,
  },
  profileName: {
    marginTop: 4,
    fontSize: 16,
    color: "#111827",
    fontWeight: 700,
  },
  detailsGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
    gap: 12,
  },
  detailCard: {
    background: "#F8FAFC",
    border: "1px solid #E2E8F0",
    borderRadius: 12,
    padding: 14,
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
} satisfies Record<string, CSSProperties | ((...args: any[]) => CSSProperties)>;
