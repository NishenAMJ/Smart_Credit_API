import { useState } from "react";
import {
  Search, Filter, Download,
  UserCheck, UserX, Shield, Settings,
  FileText, AlertTriangle, LogIn, LogOut,
} from "lucide-react";

// ── Types ─────────────────────────────────────────────────────────────────────
type ActionType =
  | "kyc_approved"
  | "kyc_rejected"
  | "user_suspended"
  | "user_activated"
  | "ad_approved"
  | "ad_rejected"
  | "admin_login"
  | "admin_logout"
  | "settings_changed"
  | "report_generated";

type Severity = "info" | "warning" | "critical" | "success";

interface AuditLog {
  id:          string;
  actionType:  ActionType;
  description: string;
  performedBy: string;
  targetName:  string;
  targetType:  "user" | "ad" | "system" | "report";
  dateTime:    string;
  ipAddress:   string;
  severity:    Severity;
}

// ── Mock Data ─────────────────────────────────────────────────────────────────
const LOGS: AuditLog[] = [
  { id: "LOG001", actionType: "kyc_approved",    description: "KYC document approved for user",         performedBy: "Admin",          targetName: "Aisha Fernando",     targetType: "user",   dateTime: "2024-01-15 14:32:05", ipAddress: "192.168.1.101", severity: "success"  },
  { id: "LOG002", actionType: "admin_login",      description: "Admin login from new device",            performedBy: "Admin",          targetName: "System",             targetType: "system", dateTime: "2024-01-15 09:15:22", ipAddress: "192.168.1.101", severity: "info"     },
  { id: "LOG003", actionType: "user_suspended",   description: "User account suspended due to fraud",    performedBy: "Admin",          targetName: "Roshan Bandara",     targetType: "user",   dateTime: "2024-01-14 16:48:33", ipAddress: "192.168.1.101", severity: "critical" },
  { id: "LOG004", actionType: "ad_approved",      description: "Lender advertisement approved",          performedBy: "Admin",          targetName: "Kasun Perera",       targetType: "ad",     dateTime: "2024-01-14 11:22:18", ipAddress: "192.168.1.101", severity: "success"  },
  { id: "LOG005", actionType: "kyc_rejected",     description: "KYC document rejected — blurry image",  performedBy: "Admin",          targetName: "Kasun Jayawardena",  targetType: "user",   dateTime: "2024-01-13 15:05:44", ipAddress: "192.168.1.102", severity: "warning"  },
  { id: "LOG006", actionType: "settings_changed", description: "Platform interest rate limits updated",  performedBy: "Super Admin",    targetName: "System Settings",    targetType: "system", dateTime: "2024-01-13 10:30:11", ipAddress: "192.168.1.100", severity: "warning"  },
  { id: "LOG007", actionType: "user_activated",   description: "Suspended user account reactivated",     performedBy: "Admin",          targetName: "Priya Rathnayake",   targetType: "user",   dateTime: "2024-01-12 14:18:55", ipAddress: "192.168.1.101", severity: "success"  },
  { id: "LOG008", actionType: "ad_rejected",      description: "Lender ad rejected — excessive rate",    performedBy: "Admin",          targetName: "Dilani Bandara",     targetType: "ad",     dateTime: "2024-01-12 09:44:30", ipAddress: "192.168.1.101", severity: "warning"  },
  { id: "LOG009", actionType: "report_generated", description: "Monthly analytics report generated",     performedBy: "Super Admin",    targetName: "Jan 2024 Report",    targetType: "report", dateTime: "2024-01-11 17:00:00", ipAddress: "192.168.1.100", severity: "info"     },
  { id: "LOG010", actionType: "kyc_approved",     description: "KYC document approved for lender",       performedBy: "Admin",          targetName: "Dilshan Bandara",    targetType: "user",   dateTime: "2024-01-11 13:22:47", ipAddress: "192.168.1.101", severity: "success"  },
  { id: "LOG011", actionType: "admin_logout",     description: "Admin session ended",                    performedBy: "Admin",          targetName: "System",             targetType: "system", dateTime: "2024-01-10 18:05:12", ipAddress: "192.168.1.101", severity: "info"     },
  { id: "LOG012", actionType: "user_suspended",   description: "User flagged for suspicious activity",   performedBy: "Super Admin",    targetName: "Sachini Gunaratne",  targetType: "user",   dateTime: "2024-01-10 11:38:29", ipAddress: "192.168.1.100", severity: "critical" },
  { id: "LOG013", actionType: "ad_approved",      description: "Lender advertisement approved",          performedBy: "Admin",          targetName: "Thilanka Rathnayake",targetType: "ad",     dateTime: "2024-01-09 15:12:03", ipAddress: "192.168.1.101", severity: "success"  },
  { id: "LOG014", actionType: "settings_changed", description: "KYC verification rules updated",         performedBy: "Super Admin",    targetName: "System Settings",    targetType: "system", dateTime: "2024-01-09 09:55:18", ipAddress: "192.168.1.100", severity: "warning"  },
  { id: "LOG015", actionType: "report_generated", description: "KYC compliance report exported",         performedBy: "Admin",          targetName: "KYC Report",         targetType: "report", dateTime: "2024-01-08 16:30:00", ipAddress: "192.168.1.101", severity: "info"     },
];

// ── Action config ─────────────────────────────────────────────────────────────
const ACTION_CONFIG: Record<ActionType, { label: string; icon: React.ElementType; color: string; bg: string }> = {
  kyc_approved:    { label: "KYC Approved",      icon: UserCheck,      color: "#10B981", bg: "#ECFDF5" },
  kyc_rejected:    { label: "KYC Rejected",      icon: UserX,          color: "#EF4444", bg: "#FEF2F2" },
  user_suspended:  { label: "User Suspended",    icon: Shield,         color: "#EF4444", bg: "#FEF2F2" },
  user_activated:  { label: "User Activated",    icon: UserCheck,      color: "#10B981", bg: "#ECFDF5" },
  ad_approved:     { label: "Ad Approved",       icon: FileText,       color: "#007AFF", bg: "#EFF6FF" },
  ad_rejected:     { label: "Ad Rejected",       icon: FileText,       color: "#EF4444", bg: "#FEF2F2" },
  admin_login:     { label: "Admin Login",       icon: LogIn,          color: "#8B5CF6", bg: "#F5F3FF" },
  admin_logout:    { label: "Admin Logout",      icon: LogOut,         color: "#6B7280", bg: "#F3F4F6" },
  settings_changed:{ label: "Settings Changed",  icon: Settings,       color: "#F59E0B", bg: "#FFFBEB" },
  report_generated:{ label: "Report Generated",  icon: FileText,       color: "#007AFF", bg: "#EFF6FF" },
};

// ── Severity config ───────────────────────────────────────────────────────────
const SEVERITY_CONFIG: Record<Severity, { label: string; color: string; bg: string }> = {
  success:  { label: "Success",  color: "#065F46", bg: "#D1FAE5" },
  info:     { label: "Info",     color: "#1E40AF", bg: "#DBEAFE" },
  warning:  { label: "Warning",  color: "#92400E", bg: "#FEF3C7" },
  critical: { label: "Critical", color: "#991B1B", bg: "#FEE2E2" },
};

// ── Log Detail Modal ──────────────────────────────────────────────────────────
function LogModal({ log, onClose }: { log: AuditLog; onClose: () => void }) {
  const action   = ACTION_CONFIG[log.actionType];
  const severity = SEVERITY_CONFIG[log.severity];
  const Icon     = action.icon;

  return (
    <div style={Mo.overlay} onClick={onClose}>
      <div style={Mo.modal} onClick={(e) => e.stopPropagation()}>

        {/* Header */}
        <div style={Mo.header}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ width: 38, height: 38, borderRadius: 10, background: action.bg, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Icon size={18} color={action.color} />
            </div>
            <div>
              <p style={Mo.title}>{action.label}</p>
              <p style={Mo.sub}>{log.id}</p>
            </div>
          </div>
          <button style={Mo.closeBtn} onClick={onClose}>
            <CloseIcon />
          </button>
        </div>

        {/* Description */}
        <div style={Mo.section}>
          <p style={Mo.sectionTitle}>Description</p>
          <p style={{ fontSize: 14, color: "#1A1A1A", lineHeight: 1.6 }}>{log.description}</p>
        </div>

        {/* Details grid */}
        <div style={Mo.section}>
          <p style={Mo.sectionTitle}>Event Details</p>
          <div style={Mo.grid}>
            {[
              { label: "Log ID",        value: log.id           },
              { label: "Performed By",  value: log.performedBy  },
              { label: "Target",        value: log.targetName   },
              { label: "Target Type",   value: log.targetType.charAt(0).toUpperCase() + log.targetType.slice(1) },
              { label: "Date & Time",   value: log.dateTime     },
              { label: "IP Address",    value: log.ipAddress    },
            ].map((item) => (
              <div key={item.label} style={Mo.gridItem}>
                <p style={Mo.gridLabel}>{item.label}</p>
                <p style={{ ...Mo.gridValue, fontFamily: item.label === "IP Address" || item.label === "Log ID" ? "monospace" : "inherit" }}>
                  {item.value}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Severity */}
        <div style={{ ...Mo.section, borderBottom: "none" }}>
          <p style={Mo.sectionTitle}>Severity Level</p>
          <span style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            padding: "6px 14px",
            borderRadius: 20,
            fontSize: 13,
            fontWeight: 600,
            background: severity.bg,
            color: severity.color,
          }}>
            {log.severity === "critical" && <AlertTriangle size={13} />}
            {severity.label}
          </span>
        </div>

      </div>
    </div>
  );
}

// tiny close icon
function CloseIcon() {
  return (
    <svg width={18} height={18} viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth={2} strokeLinecap="round">
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────
export default function AuditLogs() {
  const [search, setSearch]           = useState("");
  const [filterSeverity, setSeverity] = useState<Severity | "all">("all");
  const [filterAction, setAction]     = useState<ActionType | "all">("all");
  const [selected, setSelected]       = useState<AuditLog | null>(null);
  const [currentPage, setPage]        = useState(1);
  const PER_PAGE = 10;

  // ── Filter ─────────────────────────────────────────────────────────────────
  const filtered = LOGS.filter((log) => {
    const matchSearch =
      log.description.toLowerCase().includes(search.toLowerCase()) ||
      log.performedBy.toLowerCase().includes(search.toLowerCase()) ||
      log.targetName.toLowerCase().includes(search.toLowerCase())  ||
      log.id.toLowerCase().includes(search.toLowerCase());
    const matchSeverity = filterSeverity === "all" || log.severity    === filterSeverity;
    const matchAction   = filterAction   === "all" || log.actionType  === filterAction;
    return matchSearch && matchSeverity && matchAction;
  });

  // ── Pagination ─────────────────────────────────────────────────────────────
  const totalPages = Math.ceil(filtered.length / PER_PAGE);
  const paginated  = filtered.slice((currentPage - 1) * PER_PAGE, currentPage * PER_PAGE);

  // ── Counts ─────────────────────────────────────────────────────────────────
  const counts = {
    all:      LOGS.length,
    success:  LOGS.filter((l) => l.severity === "success").length,
    info:     LOGS.filter((l) => l.severity === "info").length,
    warning:  LOGS.filter((l) => l.severity === "warning").length,
    critical: LOGS.filter((l) => l.severity === "critical").length,
  };

  // ── Export CSV ─────────────────────────────────────────────────────────────
  function handleExport() {
    const headers = ["ID", "Action", "Description", "Performed By", "Target", "Date & Time", "IP Address", "Severity"];
    const rows    = filtered.map((log) => [
      log.id,
      ACTION_CONFIG[log.actionType].label,
      log.description,
      log.performedBy,
      log.targetName,
      log.dateTime,
      log.ipAddress,
      log.severity,
    ]);
    const csv  = [headers, ...rows].map((r) => r.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement("a");
    a.href     = url;
    a.download = "audit-logs.csv";
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div>

      {/* Page header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Audit Logs</h1>
          <p className="page-subtitle">Complete history of all admin actions on the platform</p>
        </div>
        <button
          className="btn-primary btn-sm"
          style={{ display: "flex", alignItems: "center", gap: 6 }}
          onClick={handleExport}
        >
          <Download size={14} /> Export CSV
        </button>
      </div>

      {/* ── Summary cards ── */}
      <div style={S.summaryGrid}>
        {(["all", "success", "info", "warning", "critical"] as const).map((sev) => {
          const isAll = sev === "all";
          const cfg   = isAll ? null : SEVERITY_CONFIG[sev];
          return (
            <div
              key={sev}
              className="card"
              style={{
                cursor: "pointer",
                border: filterSeverity === sev ? "2px solid #007AFF" : "none",
                transition: "border 0.15s",
              }}
              onClick={() => { setSeverity(sev); setPage(1); }}
            >
              <p style={{ fontSize: 12, color: "#6B7280", fontWeight: 500, marginBottom: 4 }}>
                {isAll ? "Total Logs" : cfg!.label}
              </p>
              <p style={{
                fontSize: 26, fontWeight: 700,
                color: isAll ? "#007AFF" : cfg!.color.replace("0.06", "1"),
              }}>
                {counts[sev]}
              </p>
            </div>
          );
        })}
      </div>

      {/* ── Filters ── */}
      <div style={S.filtersRow}>

        {/* Search */}
        <div style={{ position: "relative", flex: 1, maxWidth: 320 }}>
          <Search size={15} style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "#6B7280" }} />
          <input
            className="input"
            placeholder="Search logs..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            style={{ paddingLeft: 36, fontSize: 14 }}
          />
        </div>

        {/* Severity tabs */}
        <div className="tabs">
          {(["all", "success", "info", "warning", "critical"] as const).map((s) => (
            <button
              key={s}
              className={`tab ${filterSeverity === s ? "active" : ""}`}
              onClick={() => { setSeverity(s); setPage(1); }}
            >
              {s.charAt(0).toUpperCase() + s.slice(1)}
            </button>
          ))}
        </div>

        {/* Action type filter */}
        <select
          style={S.select}
          value={filterAction}
          onChange={(e) => { setAction(e.target.value as ActionType | "all"); setPage(1); }}
        >
          <option value="all">All Actions</option>
          {Object.entries(ACTION_CONFIG).map(([key, cfg]) => (
            <option key={key} value={key}>{cfg.label}</option>
          ))}
        </select>

        {/* Filter icon */}
        <button style={S.filterBtn}>
          <Filter size={15} /> Filter
        </button>

      </div>

      {/* ── Table ── */}
      <div className="table-container">
        <table>
          <thead>
            <tr>
              <th>Action</th>
              <th>Description</th>
              <th>Performed By</th>
              <th>Target</th>
              <th>Date & Time</th>
              <th>IP Address</th>
              <th>Severity</th>
              <th style={{ textAlign: "center" }}>Details</th>
            </tr>
          </thead>
          <tbody>
            {paginated.length === 0 ? (
              <tr>
                <td colSpan={8} style={{ textAlign: "center", padding: 40, color: "#6B7280" }}>
                  No logs found.
                </td>
              </tr>
            ) : (
              paginated.map((log) => {
                const action   = ACTION_CONFIG[log.actionType];
                const severity = SEVERITY_CONFIG[log.severity];
                const Icon     = action.icon;
                return (
                  <tr key={log.id}>

                    {/* Action */}
                    <td>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <div style={{ width: 30, height: 30, borderRadius: 8, background: action.bg, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                          <Icon size={14} color={action.color} />
                        </div>
                        <span style={{ fontSize: 13, fontWeight: 500, color: "#1A1A1A", whiteSpace: "nowrap" }}>
                          {action.label}
                        </span>
                      </div>
                    </td>

                    {/* Description */}
                    <td style={{ maxWidth: 220 }}>
                      <p style={{ fontSize: 13, color: "#374151", lineHeight: 1.4, overflow: "hidden", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" }}>
                        {log.description}
                      </p>
                    </td>

                    {/* Performed by */}
                    <td>
                      <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
                        <div style={{ width: 26, height: 26, borderRadius: "50%", background: "#EFF6FF", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, fontWeight: 700, color: "#007AFF", flexShrink: 0 }}>
                          {log.performedBy.charAt(0)}
                        </div>
                        <span style={{ fontSize: 13, fontWeight: 500 }}>{log.performedBy}</span>
                      </div>
                    </td>

                    {/* Target */}
                    <td>
                      <p style={{ fontSize: 13, fontWeight: 500, color: "#1A1A1A" }}>{log.targetName}</p>
                      <p style={{ fontSize: 11, color: "#9CA3AF", marginTop: 1 }}>{log.targetType}</p>
                    </td>

                    {/* Date & Time */}
                    <td style={{ whiteSpace: "nowrap" }}>
                      <p style={{ fontSize: 13, color: "#374151" }}>
                        {log.dateTime.split(" ")[0]}
                      </p>
                      <p style={{ fontSize: 11, color: "#9CA3AF", marginTop: 1, fontFamily: "monospace" }}>
                        {log.dateTime.split(" ")[1]}
                      </p>
                    </td>

                    {/* IP Address */}
                    <td style={{ fontSize: 12, color: "#6B7280", fontFamily: "monospace" }}>
                      {log.ipAddress}
                    </td>

                    {/* Severity */}
                    <td>
                      <span style={{ display: "inline-flex", alignItems: "center", gap: 4, padding: "3px 10px", borderRadius: 20, fontSize: 12, fontWeight: 600, background: severity.bg, color: severity.color }}>
                        {log.severity === "critical" && <AlertTriangle size={11} />}
                        {severity.label}
                      </span>
                    </td>

                    {/* View details */}
                    <td style={{ textAlign: "center" }}>
                      <button
                        style={S.viewBtn}
                        onClick={() => setSelected(log)}
                      >
                        View
                      </button>
                    </td>

                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* ── Pagination ── */}
      {totalPages > 1 && (
        <div style={S.pagination}>
          <p style={{ fontSize: 13, color: "#6B7280" }}>
            Showing {Math.min((currentPage - 1) * PER_PAGE + 1, filtered.length)}–{Math.min(currentPage * PER_PAGE, filtered.length)} of {filtered.length} logs
          </p>
          <div style={{ display: "flex", gap: 4 }}>
            <button
              style={{ ...S.pageBtn, opacity: currentPage === 1 ? 0.4 : 1 }}
              disabled={currentPage === 1}
              onClick={() => setPage((p) => p - 1)}
            >
              ←
            </button>
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
              <button
                key={p}
                style={{
                  ...S.pageBtn,
                  background:   p === currentPage ? "#007AFF" : "#FFFFFF",
                  color:        p === currentPage ? "#FFFFFF" : "#374151",
                  borderColor:  p === currentPage ? "#007AFF" : "#F3F4F6",
                  fontWeight:   p === currentPage ? 600 : 400,
                }}
                onClick={() => setPage(p)}
              >
                {p}
              </button>
            ))}
            <button
              style={{ ...S.pageBtn, opacity: currentPage === totalPages ? 0.4 : 1 }}
              disabled={currentPage === totalPages}
              onClick={() => setPage((p) => p + 1)}
            >
              →
            </button>
          </div>
        </div>
      )}

      {/* ── Modal ── */}
      {selected && (
        <LogModal
          log={selected}
          onClose={() => setSelected(null)}
        />
      )}

    </div>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────
const S = {
  summaryGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(5, 1fr)",
    gap: 12,
    marginBottom: 24,
  } as React.CSSProperties,

  filtersRow: {
    display: "flex",
    alignItems: "center",
    gap: 12,
    marginBottom: 16,
    flexWrap: "wrap",
  } as React.CSSProperties,

  select: {
    padding: "9px 14px",
    borderRadius: 8,
    border: "1.5px solid #F3F4F6",
    background: "#FFFFFF",
    fontSize: 13,
    fontWeight: 500,
    color: "#374151",
    cursor: "pointer",
    fontFamily: "inherit",
    outline: "none",
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

  viewBtn: {
    padding: "5px 12px",
    borderRadius: 6,
    border: "1.5px solid #E5E7EB",
    background: "#FFFFFF",
    fontSize: 12,
    fontWeight: 500,
    color: "#374151",
    cursor: "pointer",
    fontFamily: "inherit",
    transition: "all 0.15s",
  } as React.CSSProperties,

  pagination: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 16,
    padding: "12px 16px",
    background: "#FFFFFF",
    borderRadius: 10,
    boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
  } as React.CSSProperties,

  pageBtn: {
    width: 34,
    height: 34,
    borderRadius: 8,
    border: "1.5px solid #F3F4F6",
    background: "#FFFFFF",
    fontSize: 13,
    color: "#374151",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontFamily: "inherit",
  } as React.CSSProperties,
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
    alignItems: "center",
    padding: "20px 24px",
    borderBottom: "1px solid #F3F4F6",
  },
  title:   { fontSize: 15, fontWeight: 700, color: "#1A1A1A" },
  sub:     { fontSize: 12, color: "#6B7280", marginTop: 2, fontFamily: "monospace" },
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
    fontSize: 11,
    fontWeight: 600,
    color: "#9CA3AF",
    textTransform: "uppercase",
    letterSpacing: "0.06em",
    marginBottom: 10,
  },
  grid:      { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 },
  gridItem:  { background: "#F9FAFB", borderRadius: 8, padding: "10px 12px" },
  gridLabel: { fontSize: 11, color: "#9CA3AF", fontWeight: 500, marginBottom: 3 },
  gridValue: { fontSize: 13, fontWeight: 600, color: "#1A1A1A" },
};