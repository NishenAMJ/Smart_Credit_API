import { useState } from "react";
import { Search, Eye, Check, X, Filter } from "lucide-react";

// ── Types ─────────────────────────────────────────────────────────────────────
type KYCStatus = "pending" | "approved" | "rejected";

interface KYCRecord {
  id:         string;
  name:       string;
  email:      string;
  type:       "Borrower" | "Lender";
  uploadDate: string;
  docType:    string;
  status:     KYCStatus;
}

// ── Mock Data ─────────────────────────────────────────────────────────────────
const INITIAL_DATA: KYCRecord[] = [
  { id: "KYC001", name: "Aisha Fernando",   email: "aisha@email.com",   type: "Borrower", uploadDate: "2024-01-15", docType: "National ID",    status: "pending"  },
  { id: "KYC002", name: "Rohan Perera",     email: "rohan@email.com",   type: "Lender",   uploadDate: "2024-01-14", docType: "Passport",       status: "approved" },
  { id: "KYC003", name: "Nimal Silva",      email: "nimal@email.com",   type: "Borrower", uploadDate: "2024-01-14", docType: "Driving License",status: "pending"  },
  { id: "KYC004", name: "Kasun Jayawardena",email: "kasun@email.com",   type: "Lender",   uploadDate: "2024-01-13", docType: "National ID",    status: "rejected" },
  { id: "KYC005", name: "Priya Rathnayake", email: "priya@email.com",   type: "Borrower", uploadDate: "2024-01-13", docType: "Passport",       status: "pending"  },
  { id: "KYC006", name: "Dilshan Bandara",  email: "dilshan@email.com", type: "Lender",   uploadDate: "2024-01-12", docType: "National ID",    status: "approved" },
  { id: "KYC007", name: "Sachini Madushani",email: "sachini@email.com", type: "Borrower", uploadDate: "2024-01-12", docType: "Driving License",status: "pending"  },
  { id: "KYC008", name: "Tharaka Wijesinghe",email:"tharaka@email.com", type: "Lender",   uploadDate: "2024-01-11", docType: "Passport",       status: "approved" },
];

// ── Sub-components ────────────────────────────────────────────────────────────
function StatusBadge({ status }: { status: KYCStatus }) {
  const map: Record<KYCStatus, string> = {
    pending:  "badge badge-warning",
    approved: "badge badge-success",
    rejected: "badge badge-danger",
  };
  return <span className={map[status]}>{status.charAt(0).toUpperCase() + status.slice(1)}</span>;
}

function Avatar({ name }: { name: string }) {
  const initials = name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase();
  return (
    <div style={{
      width: 34, height: 34, borderRadius: "50%",
      background: "#EFF6FF", color: "#007AFF",
      display: "flex", alignItems: "center", justifyContent: "center",
      fontSize: 12, fontWeight: 600, flexShrink: 0,
    }}>
      {initials}
    </div>
  );
}

// ── Modal ─────────────────────────────────────────────────────────────────────
function KYCModal({
  record,
  onClose,
  onApprove,
  onReject,
}: {
  record:    KYCRecord;
  onClose:   () => void;
  onApprove: (id: string) => void;
  onReject:  (id: string) => void;
}) {
  return (
    <div style={M.overlay} onClick={onClose}>
      <div style={M.modal} onClick={(e) => e.stopPropagation()}>

        {/* Header */}
        <div style={M.header}>
          <div>
            <p style={M.title}>KYC Review</p>
            <p style={M.sub}>{record.id}</p>
          </div>
          <button style={M.closeBtn} onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        {/* User info */}
        <div style={M.section}>
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <div style={M.bigAvatar}>
              {record.name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase()}
            </div>
            <div>
              <p style={M.name}>{record.name}</p>
              <p style={M.email}>{record.email}</p>
              <div style={{ marginTop: 6 }}>
                <StatusBadge status={record.status} />
              </div>
            </div>
          </div>
        </div>

        {/* Details grid */}
        <div style={M.section}>
          <p style={M.sectionTitle}>Submission Details</p>
          <div style={M.grid}>
            {[
              { label: "Account Type",   value: record.type       },
              { label: "Document Type",  value: record.docType    },
              { label: "Upload Date",    value: record.uploadDate },
              { label: "KYC ID",         value: record.id         },
            ].map((item) => (
              <div key={item.label} style={M.gridItem}>
                <p style={M.gridLabel}>{item.label}</p>
                <p style={M.gridValue}>{item.value}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Document preview placeholder */}
        <div style={M.section}>
          <p style={M.sectionTitle}>Document Preview</p>
          <div style={M.docPreview}>
            <div style={{ fontSize: 32, marginBottom: 8 }}>📄</div>
            <p style={{ fontSize: 13, color: "#6B7280", fontWeight: 500 }}>
              {record.docType}
            </p>
            <p style={{ fontSize: 12, color: "#9CA3AF", marginTop: 4 }}>
              Document preview would appear here
            </p>
          </div>
        </div>

        {/* Actions */}
        {record.status === "pending" && (
          <div style={M.actions}>
            <button
              className="btn-danger"
              style={{ flex: 1 }}
              onClick={() => { onReject(record.id); onClose(); }}
            >
              <X size={15} /> Reject
            </button>
            <button
              className="btn-primary"
              style={{ flex: 1 }}
              onClick={() => { onApprove(record.id); onClose(); }}
            >
              <Check size={15} /> Approve
            </button>
          </div>
        )}

      </div>
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────
export default function KYCApprovals() {
  const [records, setRecords]       = useState<KYCRecord[]>(INITIAL_DATA);
  const [search, setSearch]         = useState("");
  const [filterStatus, setFilter]   = useState<KYCStatus | "all">("all");
  const [selected, setSelected]     = useState<KYCRecord | null>(null);

  // ── Handlers ────────────────────────────────────────────────────────────────
  function handleApprove(id: string) {
    setRecords((prev) =>
      prev.map((r) => (r.id === id ? { ...r, status: "approved" } : r))
    );
  }

  function handleReject(id: string) {
    setRecords((prev) =>
      prev.map((r) => (r.id === id ? { ...r, status: "rejected" } : r))
    );
  }

  // ── Filtered data ────────────────────────────────────────────────────────────
  const filtered = records.filter((r) => {
    const matchSearch =
      r.name.toLowerCase().includes(search.toLowerCase()) ||
      r.email.toLowerCase().includes(search.toLowerCase()) ||
      r.id.toLowerCase().includes(search.toLowerCase());
    const matchStatus = filterStatus === "all" || r.status === filterStatus;
    return matchSearch && matchStatus;
  });

  // ── Summary counts ───────────────────────────────────────────────────────────
  const counts = {
    all:      records.length,
    pending:  records.filter((r) => r.status === "pending").length,
    approved: records.filter((r) => r.status === "approved").length,
    rejected: records.filter((r) => r.status === "rejected").length,
  };

  return (
    <div>

      {/* Page header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">KYC Approvals</h1>
          <p className="page-subtitle">Review and manage identity verification requests</p>
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <span style={{
            background: "#FEF3C7", color: "#92400E",
            borderRadius: 20, padding: "4px 12px",
            fontSize: 13, fontWeight: 600,
          }}>
            {counts.pending} Pending
          </span>
        </div>
      </div>

      {/* ── Summary cards ── */}
      <div style={S.summaryGrid}>
        {([
          { label: "Total",    count: counts.all,      color: "#007AFF", bg: "#EFF6FF" },
          { label: "Pending",  count: counts.pending,  color: "#F59E0B", bg: "#FFFBEB" },
          { label: "Approved", count: counts.approved, color: "#10B981", bg: "#ECFDF5" },
          { label: "Rejected", count: counts.rejected, color: "#EF4444", bg: "#FEF2F2" },
        ] as const).map((item) => (
          <div key={item.label} className="card" style={S.summaryCard}>
            <p style={{ fontSize: 13, color: "#6B7280", fontWeight: 500 }}>{item.label}</p>
            <p style={{ fontSize: 28, fontWeight: 700, color: item.color, marginTop: 4 }}>
              {item.count}
            </p>
          </div>
        ))}
      </div>

      {/* ── Filters row ── */}
      <div style={S.filtersRow}>

        {/* Search */}
        <div style={{ position: "relative", flex: 1, maxWidth: 320 }}>
          <Search
            size={15}
            style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "#6B7280" }}
          />
          <input
            className="input"
            placeholder="Search by name, email or ID..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ paddingLeft: 36, fontSize: 14 }}
          />
        </div>

        {/* Status tabs */}
        <div className="tabs">
          {(["all", "pending", "approved", "rejected"] as const).map((s) => (
            <button
              key={s}
              className={`tab ${filterStatus === s ? "active" : ""}`}
              onClick={() => setFilter(s)}
            >
              {s.charAt(0).toUpperCase() + s.slice(1)}
              <span style={{
                marginLeft: 6,
                background: filterStatus === s ? "#EFF6FF" : "#F3F4F6",
                color: filterStatus === s ? "#007AFF" : "#6B7280",
                borderRadius: 10,
                padding: "1px 7px",
                fontSize: 11,
                fontWeight: 600,
              }}>
                {counts[s]}
              </span>
            </button>
          ))}
        </div>

        {/* Filter icon */}
        <button style={S.filterBtn}>
          <Filter size={15} />
          Filter
        </button>

      </div>

      {/* ── Table ── */}
      <div className="table-container">
        <table>
          <thead>
            <tr>
              <th>Name</th>
              <th>ID</th>
              <th>Type</th>
              <th>Document</th>
              <th>Upload Date</th>
              <th>Status</th>
              <th style={{ textAlign: "center" }}>Action</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={7} style={{ textAlign: "center", padding: 40, color: "#6B7280" }}>
                  No records found.
                </td>
              </tr>
            ) : (
              filtered.map((record) => (
                <tr key={record.id}>

                  {/* Name */}
                  <td>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <Avatar name={record.name} />
                      <div>
                        <p style={{ fontWeight: 500, fontSize: 14 }}>{record.name}</p>
                        <p style={{ fontSize: 12, color: "#6B7280" }}>{record.email}</p>
                      </div>
                    </div>
                  </td>

                  {/* ID */}
                  <td style={{ color: "#6B7280", fontSize: 13, fontFamily: "monospace" }}>
                    {record.id}
                  </td>

                  {/* Type */}
                  <td>
                    <span style={{
                      fontSize: 12, fontWeight: 500,
                      color: record.type === "Lender" ? "#007AFF" : "#8B5CF6",
                      background: record.type === "Lender" ? "#EFF6FF" : "#F5F3FF",
                      padding: "3px 10px", borderRadius: 20,
                    }}>
                      {record.type}
                    </span>
                  </td>

                  {/* Doc type */}
                  <td style={{ fontSize: 14, color: "#374151" }}>{record.docType}</td>

                  {/* Date */}
                  <td style={{ fontSize: 13, color: "#6B7280" }}>{record.uploadDate}</td>

                  {/* Status */}
                  <td><StatusBadge status={record.status} /></td>

                  {/* Actions */}
                  <td>
                    <div style={{ display: "flex", gap: 6, justifyContent: "center" }}>

                      {/* View */}
                      <button
                        style={S.iconBtn("#6B7280", "#F3F4F6")}
                        onClick={() => setSelected(record)}
                        title="View Details"
                      >
                        <Eye size={14} />
                      </button>

                      {/* Approve */}
                      {record.status === "pending" && (
                        <button
                          style={S.iconBtn("#10B981", "#ECFDF5")}
                          onClick={() => handleApprove(record.id)}
                          title="Approve"
                        >
                          <Check size={14} />
                        </button>
                      )}

                      {/* Reject */}
                      {record.status === "pending" && (
                        <button
                          style={S.iconBtn("#EF4444", "#FEF2F2")}
                          onClick={() => handleReject(record.id)}
                          title="Reject"
                        >
                          <X size={14} />
                        </button>
                      )}

                    </div>
                  </td>

                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* ── Modal ── */}
      {selected && (
        <KYCModal
          record={selected}
          onClose={() => setSelected(null)}
          onApprove={handleApprove}
          onReject={handleReject}
        />
      )}

    </div>
  );
}

// ── Page Styles ───────────────────────────────────────────────────────────────
const S = {
  summaryGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(4, 1fr)",
    gap: 16,
    marginBottom: 24,
  } as React.CSSProperties,

  summaryCard: {
    display: "flex",
    flexDirection: "column",
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
    color: color,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    cursor: "pointer",
    flexShrink: 0,
  }),
};

// ── Modal Styles ──────────────────────────────────────────────────────────────
const M: Record<string, React.CSSProperties> = {
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
    maxWidth: 480,
    boxShadow: "0 20px 60px rgba(0,0,0,0.15)",
    overflow: "hidden",
  },
  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    padding: "20px 24px 16px",
    borderBottom: "1px solid #F3F4F6",
  },
  title: {
    fontSize: 16,
    fontWeight: 700,
    color: "#1A1A1A",
  },
  sub: {
    fontSize: 12,
    color: "#6B7280",
    marginTop: 2,
    fontFamily: "monospace",
  },
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
  section: {
    padding: "16px 24px",
    borderBottom: "1px solid #F3F4F6",
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: 600,
    color: "#6B7280",
    textTransform: "uppercase",
    letterSpacing: "0.05em",
    marginBottom: 12,
  },
  bigAvatar: {
    width: 52,
    height: 52,
    borderRadius: "50%",
    background: "#EFF6FF",
    color: "#007AFF",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: 16,
    fontWeight: 700,
    flexShrink: 0,
  },
  name: {
    fontSize: 16,
    fontWeight: 600,
    color: "#1A1A1A",
  },
  email: {
    fontSize: 13,
    color: "#6B7280",
    marginTop: 2,
  },
  grid: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: 12,
  },
  gridItem: {
    background: "#F9FAFB",
    borderRadius: 8,
    padding: "10px 12px",
  },
  gridLabel: {
    fontSize: 11,
    color: "#9CA3AF",
    fontWeight: 500,
    marginBottom: 3,
  },
  gridValue: {
    fontSize: 13,
    fontWeight: 600,
    color: "#1A1A1A",
  },
  docPreview: {
    background: "#F9FAFB",
    borderRadius: 10,
    padding: "28px",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    border: "2px dashed #E5E7EB",
    minHeight: 120,
  },
  actions: {
    display: "flex",
    gap: 12,
    padding: "16px 24px",
  },
};