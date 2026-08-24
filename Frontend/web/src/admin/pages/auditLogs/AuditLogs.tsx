import { useCallback, useEffect, useMemo, useState } from "react";
import { AlertTriangle, CheckCircle2, ChevronLeft, ChevronRight, Download, FileText, Info, ShieldAlert, X } from "lucide-react";
import { getAuditLogs, type AuditLogEntry, type AuditSeverity } from "../../lib/api";
import { subscribeToAdminChanges } from "../../lib/admin-realtime";

const SEVERITIES = ["all", "success", "info", "warning", "critical"] as const;
const PAGE_SIZE_OPTIONS = [10, 20, 50, 100] as const;
const SEVERITY_META: Record<AuditSeverity, { color: string; bg: string; icon: React.ElementType }> = {
  success: { color: "#047857", bg: "#D1FAE5", icon: CheckCircle2 },
  info: { color: "#1D4ED8", bg: "#DBEAFE", icon: Info },
  warning: { color: "#B45309", bg: "#FEF3C7", icon: AlertTriangle },
  critical: { color: "#B91C1C", bg: "#FEE2E2", icon: ShieldAlert },
};

// ADMIN: View audit logs - frontend
export default function AuditLogs() {
  const [logs, setLogs] = useState<AuditLogEntry[]>([]);
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [selected, setSelected] = useState<AuditLogEntry | null>(null);
  const [pageSize, setPageSize] = useState(10);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const all: AuditLogEntry[] = [];
      let cursor: string | undefined;
      do {
        const response = await getAuditLogs({ limit: 50, cursor });
        all.push(...response.logs);
        cursor = response.hasMore ? response.nextCursor : undefined;
      } while (cursor);
      setLogs(all); setError("");
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : "Failed to load audit logs.");
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { void load(); }, [load]);
  useEffect(() => subscribeToAdminChanges(["users", "kyc", "ads", "audit"], () => void load()), [load]);
  useEffect(() => { setPage(1); }, [dateFrom, dateTo, pageSize]);

  const filtered = useMemo(() => {
    return logs.filter((log) => {
      const date = parseAuditDate(log.dateTime);
      return (!dateFrom || Boolean(date && date >= new Date(`${dateFrom}T00:00:00`))) &&
        (!dateTo || Boolean(date && date <= new Date(`${dateTo}T23:59:59.999`)));
    });
  }, [dateFrom, dateTo, logs]);
  const pages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const pageLogs = filtered.slice((page - 1) * pageSize, page * pageSize);
  const counts = Object.fromEntries(SEVERITIES.map((value) => [value,
    value === "all" ? logs.length : logs.filter((log) => log.severity === value).length])) as Record<(typeof SEVERITIES)[number], number>;
  const filtersActive = Boolean(dateFrom || dateTo);

  function clearFilters() {
    setDateFrom(""); setDateTo("");
  }

  function exportCsv() {
    const headers = ["Log ID", "Action", "Description", "Administrator", "Actor ID", "Target",
      "Target Reference", "Target Type", "Date", "Severity", "IP Address", "Session ID", "Before", "After"];
    const rows = filtered.map((log) => [log.id, readableAction(log.action), cleanDescription(log),
      log.performedBy, log.actorId, log.targetName, log.targetId, readableLabel(log.targetType),
      formatAuditDate(log.dateTime), readableLabel(log.severity), log.ipAddress ?? "", log.sessionId ?? "",
      stringify(log.before), stringify(log.after)]);
    const csv = [headers, ...rows].map((row) => row.map(csvCell).join(",")).join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    const link = document.createElement("a"); link.href = url;
    link.download = `audit-logs-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click(); URL.revokeObjectURL(url);
  }

  return <div>
    <div className="page-header"><div><h1 className="page-title">Audit Logs</h1>
      <p className="page-subtitle">Review administrative actions and platform activity</p></div>
      <button className="btn-primary btn-sm" onClick={exportCsv} disabled={!filtered.length}><Download size={15} /> Export CSV</button>
    </div>
    {error && <div className="card" style={S.error}>{error}</div>}
    <div style={S.summaryGrid}>{SEVERITIES.map((value) => {
      const meta = value === "all" ? { color: "#007AFF", bg: "#EFF6FF", icon: FileText } : SEVERITY_META[value];
      const Icon = meta.icon;
      return <div key={value} className="card" style={S.summary}>
        <div style={{ ...S.summaryIcon, color: meta.color, background: meta.bg }}><Icon size={17} /></div>
        <div><p style={S.summaryLabel}>{readableLabel(value)}</p><p style={{ ...S.summaryValue, color: meta.color }}>{loading ? "…" : counts[value]}</p></div></div>;
    })}</div>

    <div className="card" style={S.filters}>
      <span style={S.dateFilterLabel}>Date range</span>
      <input className="input" style={S.dateInput} type="date" value={dateFrom} onChange={(event) => setDateFrom(event.target.value)} title="From date" />
      <input className="input" style={S.dateInput} type="date" value={dateTo} min={dateFrom || undefined} onChange={(event) => setDateTo(event.target.value)} title="To date" />
      {filtersActive && <button className="btn-secondary btn-sm" onClick={clearFilters}><X size={15} /> Clear Dates</button>}
    </div>

    <div className="table-container" style={S.tableContainer}><table style={S.table}><colgroup>
      <col style={{ width: "25%" }} /><col style={{ width: "18%" }} />
      <col style={{ width: "22%" }} /><col style={{ width: "17%" }} />
      <col style={{ width: "18%" }} />
    </colgroup><thead><tr><th>Action</th><th>Administrator</th><th>Target</th><th>Date &amp; Time</th><th>Description</th></tr></thead>
      <tbody>{pageLogs.map((log) => { const meta = SEVERITY_META[log.severity]; const Icon = meta.icon;
        return <tr key={log.id} style={S.row} onClick={() => setSelected(log)} title="View audit details">
          <td><div style={S.actionCell}><span style={{ ...S.actionIcon, color: meta.color, background: meta.bg }}><Icon size={15} /></span><strong style={S.ellipsis} title={readableAction(log.action)}>{readableAction(log.action)}</strong></div></td>
          <td><div style={S.adminCell}><span style={S.adminAvatar}>{initials(log.performedBy)}</span><strong style={S.ellipsis} title={log.performedBy}>{log.performedBy}</strong></div></td>
          <td><strong style={S.ellipsis} title={log.targetName}>{log.targetName}</strong><div style={S.targetReference}>{shortTarget(log)}</div></td>
          <td style={S.dateTimeCell}>{formatAuditDate(log.dateTime)}</td>
          <td style={S.description} title={cleanDescription(log)}>{cleanDescription(log)}</td>
        </tr>; })}
        {!pageLogs.length && <tr><td colSpan={5} style={S.empty}>{loading ? "Loading audit logs..." : "No audit logs match the selected filters."}</td></tr>}
      </tbody></table>
      <div style={S.pagination}><div style={S.paginationGroup}><span>Showing {filtered.length ? (page - 1) * pageSize + 1 : 0}–{Math.min(page * pageSize, filtered.length)} of {filtered.length}</span>
        <label>Rows: <select value={pageSize} onChange={(event) => setPageSize(Number(event.target.value))} style={S.rowsSelect}>
          {PAGE_SIZE_OPTIONS.map((value) => <option key={value}>{value}</option>)}</select></label></div>
        <div style={S.paginationGroup}><button className="btn-secondary btn-sm" disabled={page === 1} onClick={() => setPage((value) => value - 1)}><ChevronLeft size={16} /> Previous</button>
          <span>Page {page} of {pages}</span><button className="btn-secondary btn-sm" disabled={page >= pages} onClick={() => setPage((value) => value + 1)}>Next <ChevronRight size={16} /></button></div>
      </div>
    </div>
    {selected && <AuditDetails log={selected} onClose={() => setSelected(null)} />}
  </div>;
}

function AuditDetails({ log, onClose }: { log: AuditLogEntry; onClose: () => void }) {
  const details = [["Log reference", shortReference(log.id, "LOG")], ["Full log ID", log.id],
    ["Action", readableAction(log.action)], ["Administrator", log.performedBy], ["Administrator ID", log.actorId || "N/A"],
    ["Target", log.targetName], ["Target reference", shortTarget(log)], ["Target type", readableLabel(log.targetType)],
    ["Date", formatAuditDate(log.dateTime)], ["Severity", readableLabel(log.severity)],
    ["IP address", log.ipAddress ?? "Not recorded"], ["Session", log.sessionId ?? "Not recorded"],
    ["Description", cleanDescription(log)]];
  return <div style={S.overlay} onClick={onClose}><div style={S.modal} role="dialog" aria-modal="true" onClick={(event) => event.stopPropagation()}>
    <div style={S.modalHeader}><div><h2 style={S.modalTitle}>Audit Log Details</h2><p style={S.muted}>{shortReference(log.id, "LOG")}</p></div>
      <button className="btn-secondary btn-sm" onClick={onClose} aria-label="Close"><X size={18} /></button></div>
    <div style={S.detailGrid}>{details.map(([name, value]) => <Detail key={name} label={name} value={value} />)}</div>
    {(hasValue(log.before) || hasValue(log.after)) && <div style={S.changeGrid}>
      <Detail label="Before" value={stringify(log.before) || "No previous value"} code />
      <Detail label="After" value={stringify(log.after) || "No updated value"} code />
    </div>}
    {Object.keys(log.metadata ?? {}).length > 0 && <Detail label="Additional information" value={stringify(log.metadata)} code />}
  </div></div>;
}

function Detail({ label, value, code = false }: { label: string; value: string; code?: boolean }) {
  return <div style={S.detail}><span style={S.detailLabel}>{label}</span><span style={{ ...S.detailValue, fontFamily: code ? "monospace" : "inherit", whiteSpace: code ? "pre-wrap" : "normal" }}>{value}</span></div>;
}

function readableAction(action: string) {
  const aliases: Record<string, string> = { "ad.approved": "Advertisement Approved", "ad.rejected": "Advertisement Rejected",
    "ad_boost.approved": "Advertisement Boost Approved", "ad_boost.rejected": "Advertisement Boost Rejected",
    "kyc.approved": "KYC Approved", "kyc.rejected": "KYC Rejected", "user.suspended": "User Suspended", "user.activated": "User Activated" };
  return aliases[action] ?? readableLabel(action.replaceAll(".", " "));
}
function cleanDescription(log: AuditLogEntry) {
  const raw = log.description.trim();
  if (!raw || raw === log.action.replaceAll(".", " ") || raw.includes("_")) return readableAction(log.action);
  return raw.charAt(0).toUpperCase() + raw.slice(1);
}
function readableLabel(value: string) { return value.replaceAll("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase()); }
function initials(value: string) { return value.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]).join("").toUpperCase() || "A"; }
function parseAuditDate(value: string) { if (!value || value === "N/A") return null; const date = new Date(value.replace(" ", "T") + "+05:30"); return Number.isNaN(date.getTime()) ? null : date; }
function formatAuditDate(value: string) { const date = parseAuditDate(value); return date ? date.toLocaleString("en-GB", { day: "2-digit", month: "short", year: "numeric", hour: "numeric", minute: "2-digit", hour12: true }) : value; }
function shortTarget(log: AuditLogEntry) { return shortReference(log.targetId || log.targetName, log.targetType === "boost" ? "BOOST" : log.targetType.toUpperCase()); }
function shortReference(id: string, prefix: string) { let hash = 0; for (const char of id) hash = (hash * 31 + char.charCodeAt(0)) >>> 0; return `${prefix}-${String(hash % 1_000_000).padStart(6, "0")}`; }
function stringify(value: unknown) { if (!hasValue(value)) return ""; return typeof value === "string" ? value : JSON.stringify(value, null, 2); }
function hasValue(value: unknown) { return value !== null && value !== undefined && (!(typeof value === "object") || Object.keys(value as object).length > 0); }
function csvCell(value: string) { return `"${value.replaceAll('"', '""')}"`; }

const S: Record<string, React.CSSProperties> = {
  error: { marginBottom: 16, color: "#991B1B", background: "#FEF2F2" },
  summaryGrid: { display: "grid", gridTemplateColumns: "repeat(5, minmax(0, 1fr))", gap: 16, marginBottom: 20 },
  summary: { display: "flex", alignItems: "center", gap: 12, textAlign: "left" },
  summaryIcon: { width: 38, height: 38, borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center" },
  summaryLabel: { fontSize: 12, fontWeight: 600, color: "#6B7280" }, summaryValue: { marginTop: 3, fontSize: 25, fontWeight: 700 },
  filters: { display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", marginBottom: 16 },
  dateFilterLabel: { fontSize: 13, fontWeight: 600, color: "#374151" }, dateInput: { width: 165 },
  row: { cursor: "pointer" }, tableContainer: { overflowX: "hidden", marginBottom: 96 },
  actionCell: { display: "flex", alignItems: "center", gap: 10, minWidth: 0 },
  table: { width: "100%", tableLayout: "fixed" },
  actionIcon: { width: 30, height: 30, borderRadius: 8, display: "inline-flex", alignItems: "center", justifyContent: "center", flexShrink: 0 },
  description: { overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", color: "#4B5563" },
  adminCell: { display: "flex", alignItems: "center", gap: 9, minWidth: 0 },
  adminAvatar: { width: 30, height: 30, borderRadius: "50%", display: "inline-flex", alignItems: "center", justifyContent: "center", flexShrink: 0, background: "#EFF6FF", color: "#2563EB", fontSize: 11, fontWeight: 700 },
  ellipsis: { display: "block", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" },
  dateTimeCell: { whiteSpace: "nowrap", color: "#374151", fontSize: 12, fontWeight: 600, fontVariantNumeric: "tabular-nums" },
  muted: { marginTop: 3, fontSize: 11, color: "#9CA3AF", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" },
  targetReference: { display: "inline-block", marginTop: 5, padding: "2px 7px", borderRadius: 6, background: "#F3F4F6", color: "#6B7280", fontSize: 10, fontWeight: 600, letterSpacing: "0.02em" },
  empty: { textAlign: "center", padding: 40, color: "#6B7280" }, pagination: { display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, padding: "16px 180px 16px 16px", borderTop: "1px solid #E5E7EB", color: "#6B7280", fontSize: 13 },
  paginationGroup: { display: "flex", alignItems: "center", gap: 10 }, rowsSelect: { marginLeft: 4, padding: "5px 8px", border: "1px solid #E5E7EB", borderRadius: 6, background: "#fff" },
  overlay: { position: "fixed", inset: 0, zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: 20, background: "rgba(15,23,42,.55)" },
  modal: { width: "min(800px, 94vw)", maxHeight: "88vh", overflowY: "auto", padding: 24, borderRadius: 16, background: "#fff", boxShadow: "0 24px 60px rgba(15,23,42,.25)" },
  modalHeader: { display: "flex", alignItems: "flex-start", justifyContent: "space-between", paddingBottom: 16, borderBottom: "1px solid #E5E7EB" }, modalTitle: { margin: 0, fontSize: 20 },
  detailGrid: { display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 12, marginTop: 16, marginBottom: 12 }, changeGrid: { display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 12, marginBottom: 12 },
  detail: { display: "flex", flexDirection: "column", gap: 5, padding: 12, border: "1px solid #E5E7EB", borderRadius: 10, background: "#F9FAFB", overflowWrap: "anywhere" },
  detailLabel: { fontSize: 11, fontWeight: 600, color: "#6B7280", textTransform: "uppercase" }, detailValue: { fontSize: 13, fontWeight: 600, color: "#111827" },
};
