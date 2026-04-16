import type { CSSProperties } from "react";
import { useEffect, useMemo, useState } from "react";
import { Search, Eye, Check, X, Megaphone } from "lucide-react";
import { approveAd, getAds, rejectAd, type AdminAd, type AdStatus } from "../../lib/api";
import { formatFirestoreDate } from "../../lib/admin-format";

type LenderAdRow = {
  id: string;
  lender: string;
  title: string;
  description: string;
  interestRate: string;
  maxAmount: string;
  duration: string;
  status: AdStatus;
  postedDate: string;
  adType: "borrower" | "lender";
};

// Converts backend ads into stable rows so the moderation table stays simple.
function mapAd(ad: AdminAd): LenderAdRow {
  return {
    id: ad.id,
    lender: ad.userId || "Unknown lender",
    title: ad.title,
    description: ad.description,
    interestRate: ad.interestRate ? `${ad.interestRate}%` : "N/A",
    maxAmount: typeof ad.amount === "number" ? `LKR ${ad.amount.toLocaleString()}` : "N/A",
    duration: ad.duration ? `${ad.duration} months` : "N/A",
    status: ad.status,
    postedDate: formatFirestoreDate(ad.createdAt),
    adType: ad.adType,
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

  useEffect(() => {
    // Loads the moderation queue before the admin starts taking actions.
    async function loadAds() {
      try {
        const response = await getAds();
        setAds(response.ads.map(mapAd));
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load ads.");
      } finally {
        setLoading(false);
      }
    }

    void loadAds();
  }, []);

  const filteredAds = useMemo(() => {
    return ads.filter((ad) => {
      const searchValue = search.toLowerCase();
      const matchesSearch =
        ad.lender.toLowerCase().includes(searchValue) ||
        ad.title.toLowerCase().includes(searchValue) ||
        ad.id.toLowerCase().includes(searchValue);
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

  // Mirrors an approval in local state to avoid an extra full reload.
  async function handleApprove(adId: string) {
    try {
      await approveAd(adId);
      setAds((prev) => prev.map((ad) => (ad.id === adId ? { ...ad, status: "approved" } : ad)));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to approve ad.");
    }
  }

  // Mirrors a rejection in local state to avoid an extra full reload.
  async function handleReject(adId: string) {
    try {
      await rejectAd(adId);
      setAds((prev) => prev.map((ad) => (ad.id === adId ? { ...ad, status: "rejected" } : ad)));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to reject ad.");
    }
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Lender Ads</h1>
          <p className="page-subtitle">Review and moderate live ad listings from Firebase</p>
        </div>
        <span style={S.pendingChip}>{counts.pending} Pending Review</span>
      </div>

      {error && <div className="card" style={S.errorCard}>{error}</div>}

      <div style={S.summaryGrid}>
        {[
          { label: "Total Ads", count: counts.all, color: "#007AFF" },
          { label: "Active", count: counts.active, color: "#10B981" },
          { label: "Approved", count: counts.approved, color: "#10B981" },
          { label: "Pending", count: counts.pending, color: "#F59E0B" },
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
              <th>Ad Title</th>
              <th>Interest Rate</th>
              <th>Amount</th>
              <th>Duration</th>
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
                      <div style={S.avatar}>{ad.lender.slice(0, 2).toUpperCase()}</div>
                      <div>
                        <p style={{ fontWeight: 600 }}>{ad.lender}</p>
                        <p style={{ fontSize: 12, color: "#6B7280" }}>{ad.adType}</p>
                      </div>
                    </div>
                  </td>
                  <td>
                    <div style={{ maxWidth: 220 }}>
                      <p style={{ fontWeight: 600 }}>{ad.title}</p>
                      <p style={{ fontSize: 12, color: "#6B7280" }}>{ad.description}</p>
                    </div>
                  </td>
                  <td>{ad.interestRate}</td>
                  <td>{ad.maxAmount}</td>
                  <td>{ad.duration}</td>
                  <td>{ad.postedDate}</td>
                  <td><StatusBadge status={ad.status} /></td>
                  <td>
                    <div style={S.actionRow}>
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
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {selectedAd && (
        <div style={S.modalOverlay} onClick={() => setSelectedAd(null)}>
          <div style={S.modal} onClick={(e) => e.stopPropagation()}>
            <div style={S.modalHeader}>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <div style={S.bigIcon}>
                  <Megaphone size={18} color="#007AFF" />
                </div>
                <div>
                  <h3 style={{ fontSize: 18, fontWeight: 700 }}>{selectedAd.title}</h3>
                  <p style={{ fontSize: 12, color: "#6B7280" }}>{selectedAd.id}</p>
                </div>
              </div>
              <button style={S.closeButton} onClick={() => setSelectedAd(null)}>×</button>
            </div>

            <div style={S.detailsGrid}>
              <Detail label="Lender" value={selectedAd.lender} />
              <Detail label="Ad Type" value={selectedAd.adType} />
              <Detail label="Interest Rate" value={selectedAd.interestRate} />
              <Detail label="Amount" value={selectedAd.maxAmount} />
              <Detail label="Duration" value={selectedAd.duration} />
              <Detail label="Posted Date" value={selectedAd.postedDate} />
              <Detail label="Status" value={selectedAd.status} />
              <Detail label="Description" value={selectedAd.description} />
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

const S: Record<string, CSSProperties | ((color: string, bg: string) => CSSProperties)> = {
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
};
