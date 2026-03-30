import { useState } from "react";
import { Search, Eye, Check, X, Filter, Megaphone } from "lucide-react";

// ── Types ─────────────────────────────────────────────────────────────────────
type AdStatus = "active" | "pending" | "paused" | "rejected";

interface LenderAd {
  id:           string;
  lender:       string;
  email:        string;
  adTitle:      string;
  interestRate: string;
  maxAmount:    string;
  duration:     string;
  status:       AdStatus;
  postedDate:   string;
  views:        number;
}

// ── Mock Data ─────────────────────────────────────────────────────────────────
const INITIAL_ADS: LenderAd[] = [
  { id: "AD001", lender: "Kasun Perera",      email: "kasun@email.com",   adTitle: "Low Interest Personal Loan",   interestRate: "8.5%",  maxAmount: "LKR 500,000",  duration: "12 months", status: "active",   postedDate: "2024-01-15", views: 245  },
  { id: "AD002", lender: "Nimal Fernando",    email: "nimal@email.com",   adTitle: "Business Expansion Funding",   interestRate: "10.0%", maxAmount: "LKR 1,000,000",duration: "24 months", status: "pending",  postedDate: "2024-01-14", views: 0    },
  { id: "AD003", lender: "Priya Jayawardena", email: "priya@email.com",   adTitle: "Quick Cash for Emergencies",   interestRate: "9.5%",  maxAmount: "LKR 200,000",  duration: "6 months",  status: "active",   postedDate: "2024-01-13", views: 512  },
  { id: "AD004", lender: "Roshan Silva",      email: "roshan@email.com",  adTitle: "Home Renovation Loan",         interestRate: "7.5%",  maxAmount: "LKR 750,000",  duration: "18 months", status: "paused",   postedDate: "2024-01-12", views: 128  },
  { id: "AD005", lender: "Dilani Bandara",    email: "dilani@email.com",  adTitle: "Education Financing",          interestRate: "6.0%",  maxAmount: "LKR 300,000",  duration: "36 months", status: "rejected", postedDate: "2024-01-11", views: 0    },
  { id: "AD006", lender: "Thilanka Rathnayake",email:"thilanka@email.com",adTitle: "Vehicle Purchase Loan",        interestRate: "11.0%", maxAmount: "LKR 600,000",  duration: "24 months", status: "active",   postedDate: "2024-01-10", views: 389  },
  { id: "AD007", lender: "Sachini Madushani", email: "sachini@email.com", adTitle: "Small Business Startup Fund",  interestRate: "9.0%",  maxAmount: "LKR 400,000",  duration: "12 months", status: "pending",  postedDate: "2024-01-09", views: 0    },
  { id: "AD008", lender: "Chamara Wijesinghe",email:"chamara@email.com",  adTitle: "Agricultural Support Loan",    interestRate: "5.5%",  maxAmount: "LKR 250,000",  duration: "18 months", status: "active",   postedDate: "2024-01-08", views: 167  },
];

// ── Helpers ───────────────────────────────────────────────────────────────────
function StatusBadge({ status }: { status: AdStatus }) {
  const map: Record<AdStatus, string> = {
    active:   "badge badge-success",
    pending:  "badge badge-warning",
    paused:   "badge badge-gray",
    rejected: "badge badge-danger",
  };
  return (
    <span className={map[status]}>
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  );
}

function Avatar({ name, color = "#007AFF", bg = "#EFF6FF" }: { name: string; color?: string; bg?: string }) {
  const initials = name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase();
  return (
    <div style={{
      width: 34, height: 34, borderRadius: "50%",
      background: bg, color,
      display: "flex", alignItems: "center", justifyContent: "center",
      fontSize: 12, fontWeight: 600, flexShrink: 0,
    }}>
      {initials}
    </div>
  );
}

// ── Avatar colors per lender ──────────────────────────────────────────────────
const AVATAR_COLORS = [
  { color: "#007AFF", bg: "#EFF6FF" },
  { color: "#10B981", bg: "#ECFDF5" },
  { color: "#8B5CF6", bg: "#F5F3FF" },
  { color: "#F59E0B", bg: "#FFFBEB" },
  { color: "#EF4444", bg: "#FEF2F2" },
];

// ── Modal ─────────────────────────────────────────────────────────────────────
function AdModal({
  ad,
  index,
  onClose,
  onApprove,
  onReject,
  onPause,
}: {
  ad:        LenderAd;
  index:     number;
  onClose:   () => void;
  onApprove: (id: string) => void;
  onReject:  (id: string) => void;
  onPause:   (id: string) => void;
}) {
  const avatarStyle = AVATAR_COLORS[index % AVATAR_COLORS.length];

  return (
    <div style={Mo.overlay} onClick={onClose}>
      <div style={Mo.modal} onClick={(e) => e.stopPropagation()}>

        {/* Header */}
        <div style={Mo.header}>
          <div>
            <p style={Mo.title}>Ad Details</p>
            <p style={Mo.sub}>{ad.id}</p>
          </div>
          <button style={Mo.closeBtn} onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        {/* Lender info */}
        <div style={Mo.section}>
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <div style={{ ...Mo.bigAvatar, background: avatarStyle.bg, color: avatarStyle.color }}>
              {ad.lender.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase()}
            </div>
            <div>
              <p style={Mo.name}>{ad.lender}</p>
              <p style={Mo.email}>{ad.email}</p>
              <div style={{ marginTop: 6 }}>
                <StatusBadge status={ad.status} />
              </div>
            </div>
          </div>
        </div>

        {/* Ad info */}
        <div style={Mo.section}>
          <p style={Mo.sectionTitle}>Ad Information</p>
          <div style={Mo.adTitleBox}>
            <Megaphone size={16} color="#007AFF" />
            <p style={{ fontSize: 15, fontWeight: 600, color: "#1A1A1A" }}>{ad.adTitle}</p>
          </div>
          <div style={Mo.grid}>
            {[
              { label: "Interest Rate", value: ad.interestRate },
              { label: "Max Amount",    value: ad.maxAmount    },
              { label: "Duration",      value: ad.duration     },
              { label: "Posted Date",   value: ad.postedDate   },
              { label: "Total Views",   value: ad.views > 0 ? `${ad.views.toLocaleString()} views` : "Not published" },
              { label: "Ad ID",         value: ad.id           },
            ].map((item) => (
              <div key={item.label} style={Mo.gridItem}>
                <p style={Mo.gridLabel}>{item.label}</p>
                <p style={Mo.gridValue}>{item.value}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Actions */}
        <div style={Mo.actions}>
          {ad.status === "pending" && (
            <>
              <button
                className="btn-danger"
                style={{ flex: 1 }}
                onClick={() => { onReject(ad.id); onClose(); }}
              >
                <X size={15} /> Reject
              </button>
              <button
                className="btn-primary"
                style={{ flex: 1 }}
                onClick={() => { onApprove(ad.id); onClose(); }}
              >
                <Check size={15} /> Approve
              </button>
            </>
          )}
          {ad.status === "active" && (
            <button
              className="btn-secondary"
              style={{ flex: 1 }}
              onClick={() => { onPause(ad.id); onClose(); }}
            >
              Pause Ad
            </button>
          )}
          {ad.status === "paused" && (
            <button
              className="btn-primary"
              style={{ flex: 1 }}
              onClick={() => { onApprove(ad.id); onClose(); }}
            >
              Resume Ad
            </button>
          )}
          {ad.status === "rejected" && (
            <button
              className="btn-secondary"
              style={{ flex: 1 }}
              onClick={onClose}
            >
              Close
            </button>
          )}
        </div>

      </div>
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────
export default function LenderAds() {
  const [ads, setAds]               = useState<LenderAd[]>(INITIAL_ADS);
  const [search, setSearch]         = useState("");
  const [filterStatus, setFilter]   = useState<AdStatus | "all">("all");
  const [selected, setSelected]     = useState<{ ad: LenderAd; index: number } | null>(null);

  // ── Handlers ──────────────────────────────────────────────────────────────
  function handleApprove(id: string) {
    setAds((prev) => prev.map((a) => a.id === id ? { ...a, status: "active"   } : a));
  }
  function handleReject(id: string) {
    setAds((prev) => prev.map((a) => a.id === id ? { ...a, status: "rejected" } : a));
  }
  function handlePause(id: string) {
    setAds((prev) => prev.map((a) => a.id === id ? { ...a, status: "paused"   } : a));
  }

  // ── Filtered data ──────────────────────────────────────────────────────────
  const filtered = ads.filter((a) => {
    const matchSearch =
      a.lender.toLowerCase().includes(search.toLowerCase())  ||
      a.adTitle.toLowerCase().includes(search.toLowerCase()) ||
      a.id.toLowerCase().includes(search.toLowerCase());
    const matchStatus = filterStatus === "all" || a.status === filterStatus;
    return matchSearch && matchStatus;
  });

  // ── Counts ─────────────────────────────────────────────────────────────────
  const counts = {
    all:      ads.length,
    active:   ads.filter((a) => a.status === "active").length,
    pending:  ads.filter((a) => a.status === "pending").length,
    paused:   ads.filter((a) => a.status === "paused").length,
    rejected: ads.filter((a) => a.status === "rejected").length,
  };

  return (
    <div>

      {/* Page header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Lender Ads</h1>
          <p className="page-subtitle">Review and manage lender advertisement listings</p>
        </div>
        <span style={{
          background: "#FEF3C7", color: "#92400E",
          borderRadius: 20, padding: "4px 12px",
          fontSize: 13, fontWeight: 600,
        }}>
          {counts.pending} Pending Review
        </span>
      </div>

      {/* ── Summary cards ── */}
      <div style={S.summaryGrid}>
        {([
          { label: "Total Ads",  count: counts.all,      color: "#007AFF", bg: "#EFF6FF" },
          { label: "Active",     count: counts.active,   color: "#10B981", bg: "#ECFDF5" },
          { label: "Pending",    count: counts.pending,  color: "#F59E0B", bg: "#FFFBEB" },
          { label: "Paused",     count: counts.paused,   color: "#6B7280", bg: "#F3F4F6" },
        ] as const).map((item) => (
          <div key={item.label} className="card" style={{ display: "flex", flexDirection: "column" as const, gap: 4 }}>
            <p style={{ fontSize: 13, color: "#6B7280", fontWeight: 500 }}>{item.label}</p>
            <p style={{ fontSize: 28, fontWeight: 700, color: item.color }}>{item.count}</p>
          </div>
        ))}
      </div>

      {/* ── Filters row ── */}
      <div style={S.filtersRow}>

        {/* Search */}
        <div style={{ position: "relative", flex: 1, maxWidth: 320 }}>
          <Search size={15} style={{
            position: "absolute", left: 12,
            top: "50%", transform: "translateY(-50%)", color: "#6B7280",
          }} />
          <input
            className="input"
            placeholder="Search by lender, title or ID..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ paddingLeft: 36, fontSize: 14 }}
          />
        </div>

        {/* Status tabs */}
        <div className="tabs">
          {(["all", "active", "pending", "paused", "rejected"] as const).map((s) => (
            <button
              key={s}
              className={`tab ${filterStatus === s ? "active" : ""}`}
              onClick={() => setFilter(s)}
            >
              {s.charAt(0).toUpperCase() + s.slice(1)}
              <span style={{
                marginLeft: 6,
                background: filterStatus === s ? "#EFF6FF" : "#F3F4F6",
                color:      filterStatus === s ? "#007AFF" : "#6B7280",
                borderRadius: 10, padding: "1px 7px",
                fontSize: 11, fontWeight: 600,
              }}>
                {counts[s]}
              </span>
            </button>
          ))}
        </div>

        {/* Filter button */}
        <button style={S.filterBtn}>
          <Filter size={15} /> Filter
        </button>

      </div>

      {/* ── Table ── */}
      <div className="table-container">
        <table>
          <thead>
            <tr>
              <th>Lender</th>
              <th>Ad Title</th>
              <th>Interest Rate</th>
              <th>Max Amount</th>
              <th>Duration</th>
              <th>Views</th>
              <th>Status</th>
              <th style={{ textAlign: "center" }}>Action</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={8} style={{ textAlign: "center", padding: 40, color: "#6B7280" }}>
                  No ads found.
                </td>
              </tr>
            ) : (
              filtered.map((ad, index) => {
                const avatarStyle = AVATAR_COLORS[index % AVATAR_COLORS.length];
                return (
                  <tr key={ad.id}>

                    {/* Lender */}
                    <td>
                      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <Avatar name={ad.lender} color={avatarStyle.color} bg={avatarStyle.bg} />
                        <div>
                          <p style={{ fontWeight: 500, fontSize: 14 }}>{ad.lender}</p>
                          <p style={{ fontSize: 12, color: "#6B7280" }}>{ad.email}</p>
                        </div>
                      </div>
                    </td>

                    {/* Ad title */}
                    <td>
                      <p style={{ fontSize: 14, fontWeight: 500, color: "#1A1A1A", maxWidth: 200 }}>
                        {ad.adTitle}
                      </p>
                    </td>

                    {/* Interest rate */}
                    <td>
                      <span style={{
                        fontSize: 13, fontWeight: 600, color: "#10B981",
                        background: "#ECFDF5", borderRadius: 20, padding: "3px 10px",
                      }}>
                        {ad.interestRate}
                      </span>
                    </td>

                    {/* Max amount */}
                    <td style={{ fontSize: 13, fontWeight: 500, color: "#1A1A1A" }}>
                      {ad.maxAmount}
                    </td>

                    {/* Duration */}
                    <td style={{ fontSize: 13, color: "#6B7280" }}>{ad.duration}</td>

                    {/* Views */}
                    <td style={{ fontSize: 13, color: "#6B7280" }}>
                      {ad.views > 0 ? ad.views.toLocaleString() : "—"}
                    </td>

                    {/* Status */}
                    <td><StatusBadge status={ad.status} /></td>

                    {/* Actions */}
                    <td>
                      <div style={{ display: "flex", gap: 6, justifyContent: "center" }}>

                        {/* View */}
                        <button
                          style={S.iconBtn("#6B7280", "#F3F4F6")}
                          onClick={() => setSelected({ ad, index })}
                          title="View Details"
                        >
                          <Eye size={14} />
                        </button>

                        {/* Approve (pending only) */}
                        {ad.status === "pending" && (
                          <button
                            style={S.iconBtn("#10B981", "#ECFDF5")}
                            onClick={() => handleApprove(ad.id)}
                            title="Approve"
                          >
                            <Check size={14} />
                          </button>
                        )}

                        {/* Reject (pending only) */}
                        {ad.status === "pending" && (
                          <button
                            style={S.iconBtn("#EF4444", "#FEF2F2")}
                            onClick={() => handleReject(ad.id)}
                            title="Reject"
                          >
                            <X size={14} />
                          </button>
                        )}

                        {/* Pause (active only) */}
                        {ad.status === "active" && (
                          <button
                            style={S.iconBtn("#F59E0B", "#FFFBEB")}
                            onClick={() => handlePause(ad.id)}
                            title="Pause Ad"
                          >
                            <span style={{ fontSize: 11, fontWeight: 700 }}>II</span>
                          </button>
                        )}

                      </div>
                    </td>

                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* ── Modal ── */}
      {selected && (
        <AdModal
          ad={selected.ad}
          index={selected.index}
          onClose={() => setSelected(null)}
          onApprove={handleApprove}
          onReject={handleReject}
          onPause={handlePause}
        />
      )}

    </div>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────
const S = {
  summaryGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(4, 1fr)",
    gap: 16,
    marginBottom: 24,
  } as React.CSSProperties,

  filtersRow: {
    display: "flex",
    alignItems: "center",
    gap: 12,
    marginBottom: 16,
    flexWrap: "wrap",
  } as React.CSSProperties,

  filterBtn: {
    display: "flex",
    alignItems: "center",
    gap: 6,
    padding: "9px 14px",
    borderRadius: 8,
    border: "1.5px solid #F3F4F6",
    background: "#FFFFFF",
    fontSize: 13,
    fontWeight: 500,
    color: "#6B7280",
    cursor: "pointer",
    fontFamily: "inherit",
  } as React.CSSProperties,

  iconBtn: (color: string, bg: string): React.CSSProperties => ({
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
    flexShrink: 0,
  }),
};

// ── Modal Styles ──────────────────────────────────────────────────────────────
const Mo: Record<string, React.CSSProperties> = {
  overlay: {
    position: "fixed",
    inset: 0,
    background: "rgba(0,0,0,0.4)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 1000,
    padding: 24,
  },
  modal: {
    background: "#FFFFFF",
    borderRadius: 16,
    width: "100%",
    maxWidth: 500,
    boxShadow: "0 20px 60px rgba(0,0,0,0.15)",
    overflow: "hidden",
    maxHeight: "90vh",
    overflowY: "auto",
  },
  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    padding: "20px 24px 16px",
    borderBottom: "1px solid #F3F4F6",
  },
  title: { fontSize: 16, fontWeight: 700, color: "#1A1A1A" },
  sub:   { fontSize: 12, color: "#6B7280", marginTop: 2, fontFamily: "monospace" },
  closeBtn: {
    background: "#F3F4F6",
    border: "none",
    borderRadius: 8,
    width: 32,
    height: 32,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    cursor: "pointer",
    color: "#6B7280",
  },
  section:      { padding: "16px 24px", borderBottom: "1px solid #F3F4F6" },
  sectionTitle: {
    fontSize: 11, fontWeight: 600, color: "#9CA3AF",
    textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 12,
  },
  bigAvatar: {
    width: 52, height: 52, borderRadius: "50%",
    display: "flex", alignItems: "center", justifyContent: "center",
    fontSize: 16, fontWeight: 700, flexShrink: 0,
  },
  name:  { fontSize: 16, fontWeight: 600, color: "#1A1A1A" },
  email: { fontSize: 13, color: "#6B7280", marginTop: 2   },
  adTitleBox: {
    display: "flex", alignItems: "center", gap: 10,
    background: "#EFF6FF", borderRadius: 10,
    padding: "12px 14px", marginBottom: 12,
  },
  grid:      { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 },
  gridItem:  { background: "#F9FAFB", borderRadius: 8, padding: "10px 12px" },
  gridLabel: { fontSize: 11, color: "#9CA3AF", fontWeight: 500, marginBottom: 3 },
  gridValue: { fontSize: 13, fontWeight: 600, color: "#1A1A1A" },
  actions:   { display: "flex", gap: 12, padding: "16px 24px" },
};