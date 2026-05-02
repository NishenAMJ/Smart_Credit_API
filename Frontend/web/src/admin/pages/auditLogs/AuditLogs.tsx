import type { CSSProperties } from "react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Search, Download, AlertTriangle, FileText, Shield, UserCheck, UserX, ChevronLeft, ChevronRight } from "lucide-react";
import { getAuditLogs, type AuditLogEntry, type AuditSeverity } from "../../lib/api";

const PAGE_SIZE_OPTIONS = [10, 20, 50] as const;

const ACTION_META: Record<string, { label: string; icon: React.ElementType; color: string; bg: string }> = {
  kyc_approved: { label: "KYC Approved", icon: UserCheck, color: "#10B981", bg: "#ECFDF5" },
  kyc_rejected: { label: "KYC Rejected", icon: UserX, color: "#EF4444", bg: "#FEF2F2" },
  user_suspended: { label: "User Suspended", icon: Shield, color: "#EF4444", bg: "#FEF2F2" },
  user_activated: { label: "User Activated", icon: UserCheck, color: "#10B981", bg: "#ECFDF5" },
  ad_approved: { label: "Ad Approved", icon: FileText, color: "#007AFF", bg: "#EFF6FF" },
  ad_rejected: { label: "Ad Rejected", icon: FileText, color: "#EF4444", bg: "#FEF2F2" },
  report_generated: { label: "Report Event", icon: FileText, color: "#8B5CF6", bg: "#F5F3FF" },
  system_event: { label: "System Event", icon: AlertTriangle, color: "#F59E0B", bg: "#FFFBEB" },
};

const SEVERITY_META: Record<AuditSeverity, { color: string; bg: string }> = {
  success: { color: "#065F46", bg: "#D1FAE5" },
  info: { color: "#1E40AF", bg: "#DBEAFE" },
  warning: { color: "#92400E", bg: "#FEF3C7" },
  critical: { color: "#991B1B", bg: "#FEE2E2" },
};

function splitDateTime(dateTime: string) {
  if (!dateTime || dateTime === "N/A") {
    return { date: "N/A", time: "" };
  }

  const [date, time] = dateTime.split(" ");
  return { date: date || dateTime, time: time || "" };
}

// Keeps audit filtering and export logic close to the data it operates on.
export default function AuditLogs() {
  const [logs, setLogs] = useState<AuditLogEntry[]>([]);
  const [search, setSearch] = useState("");
  const [filterSeverity, setFilterSeverity] = useState<AuditSeverity | "all">("all");
  const [selectedLog, setSelectedLog] = useState<AuditLogEntry | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  // Pagination state
  const [pageSize, setPageSize] = useState<number>(10);
  const [currentPage, setCurrentPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [nextCursor, setNextCursor] = useState<string | undefined>();
  const [cursorStack, setCursorStack] = useState<string[]>([]);
  const [totalLoaded, setTotalLoaded] = useState(0);

  const loadLogs = useCallback(async (cursor?: string) => {
    setLoading(true);
    try {
      const response = await getAuditLogs({ limit: pageSize, cursor });
      setLogs(response.logs);
      setHasMore(response.hasMore ?? false);
      setNextCursor(response.nextCursor);
      setTotalLoaded(response.count);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load audit logs.");
    } finally {
      setLoading(false);
    }
  }, [pageSize]);

  useEffect(() => {
    setCurrentPage(1);
    setCursorStack([]);
    void loadLogs();
  }, [loadLogs]);

  const filteredLogs = useMemo(() => {
    return logs.filter((log) => {
      const searchValue = search.toLowerCase();
      const matchesSearch =
        log.description.toLowerCase().includes(searchValue) ||
        log.targetName.toLowerCase().includes(searchValue) ||
        log.id.toLowerCase().includes(searchValue);
      const matchesSeverity = filterSeverity === "all" || log.severity === filterSeverity;
      return matchesSearch && matchesSeverity;
    });
  }, [filterSeverity, logs, search]);

  function handleNextPage() {
    if (!hasMore || !nextCursor) return;
    setCursorStack((prev) => [...prev, nextCursor]);
    setCurrentPage((prev) => prev + 1);
    void loadLogs(nextCursor);
  }

  function handlePrevPage() {
    if (currentPage <= 1) return;
    const newStack = [...cursorStack];
    newStack.pop();
    const prevCursor = newStack.length > 0 ? newStack[newStack.length - 1] : undefined;
    setCursorStack(newStack);
    setCurrentPage((prev) => prev - 1);
    const goToCursor = currentPage <= 2 ? undefined : prevCursor;
    void loadLogs(goToCursor);
  }

  function handlePageSizeChange(newSize: number) {
    setPageSize(newSize);
    setCurrentPage(1);
    setCursorStack([]);
  }

  // Exports the filtered view so the downloaded file matches what the admin sees.
  function exportCsv() {
    const headers = ["ID", "Action", "Description", "Performed By", "Target", "Date", "Severity"];
    const rows = filteredLogs.map((log) => [
      log.id,
      ACTION_META[log.actionType]?.label || log.actionType,
      log.description,
      log.performedBy,
      log.targetName,
      log.dateTime,
      log.severity,
    ]);
    const csv = [headers, ...rows].map((row) => row.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "audit-logs.csv";
    link.click();
    URL.revokeObjectURL(url);
  }

  const counts = {
    all: logs.length,
    success: logs.filter((log) => log.severity === "success").length,
    info: logs.filter((log) => log.severity === "info").length,
    warning: logs.filter((log) => log.severity === "warning").length,
    critical: logs.filter((log) => log.severity === "critical").length,
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Audit Logs</h1>
          <p className="page-subtitle">Activity feed generated from real admin-side Firebase records</p>
        </div>
        <button className="btn-primary btn-sm" style={{ display: "flex", alignItems: "center", gap: 6 }} onClick={exportCsv}>
          <Download size={14} /> Export CSV
        </button>
      </div>

      {error && <div className="card" style={S.errorCard}>{error}</div>}

      <div style={S.summaryGrid}>
        {(["all", "success", "info", "warning", "critical"] as const).map((severity) => (
          <div
            key={severity}
            className="card"
            style={{
              cursor: "pointer",
              border: filterSeverity === severity ? "2px solid #007AFF" : "1px solid transparent",
            }}
            onClick={() => setFilterSeverity(severity)}
          >
            <p style={{ fontSize: 12, color: "#6B7280", fontWeight: 500, marginBottom: 4 }}>{severity}</p>
            <p style={{ fontSize: 26, fontWeight: 700, color: severity === "all" ? "#007AFF" : SEVERITY_META[severity].color }}>
              {loading ? "..." : counts[severity]}
            </p>
          </div>
        ))}
      </div>

      <div style={S.filtersRow}>
        <div style={{ position: "relative", flex: 1, maxWidth: 320 }}>
          <Search size={15} style={S.searchIcon} />
          <input
            className="input"
            placeholder="Search logs..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ paddingLeft: 36 }}
          />
        </div>
      </div>

      <div className="table-container">
        <table>
          <thead>
            <tr>
              <th>Action</th>
              <th>Description</th>
              <th>Performed By</th>
              <th>Target</th>
              <th style={S.dateHeader}>Date</th>
              <th>Severity</th>
              <th style={{ textAlign: "center" }}>Details</th>
            </tr>
          </thead>
          <tbody>
            {filteredLogs.length === 0 ? (
              <tr>
                <td colSpan={7} style={S.emptyCell}>
                  {loading ? "Loading audit logs..." : "No logs found."}
                </td>
              </tr>
            ) : (
              filteredLogs.map((log) => {
                const action = ACTION_META[log.actionType] || ACTION_META.system_event;
                const Icon = action.icon;
                const severity = SEVERITY_META[log.severity];
                const dateParts = splitDateTime(log.dateTime);

                return (
                  <tr key={log.id}>
                    <td>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <div style={{ width: 30, height: 30, borderRadius: 8, background: action.bg, display: "flex", alignItems: "center", justifyContent: "center" }}>
                          <Icon size={14} color={action.color} />
                        </div>
                        <span style={{ fontSize: 13, fontWeight: 600 }}>{action.label}</span>
                      </div>
                    </td>
                    <td style={{ maxWidth: 260 }}>{log.description}</td>
                    <td>{log.performedBy}</td>
                    <td>
                      <div>
                        <div style={{ fontWeight: 600 }}>{log.targetName}</div>
                        <div style={{ fontSize: 11, color: "#9CA3AF" }}>{log.targetType}</div>
                      </div>
                    </td>
                    <td style={S.dateCell}>
                      <div style={S.dateText}>{dateParts.date}</div>
                      {dateParts.time && <div style={S.timeText}>{dateParts.time}</div>}
                    </td>
                    <td>
                      <span style={{ padding: "4px 10px", borderRadius: 20, fontSize: 12, fontWeight: 600, color: severity.color, background: severity.bg }}>
                        {log.severity}
                      </span>
                    </td>
                    <td style={{ textAlign: "center" }}>
                      <button style={S.viewButton} onClick={() => setSelectedLog(log)}>View</button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>

        {/* Pagination Controls */}
        <div style={S.paginationBar}>
          <div style={S.paginationInfo}>
            <span style={{ fontSize: 13, color: "#6B7280" }}>
              Showing {filteredLogs.length > 0 ? (currentPage - 1) * pageSize + 1 : 0}
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

      {selectedLog && (
        <div style={S.modalOverlay} onClick={() => setSelectedLog(null)}>
          <div style={S.modal} onClick={(e) => e.stopPropagation()}>
            <div style={S.modalHeader}>
              <h3 style={{ fontSize: 18, fontWeight: 700 }}>Audit Log Details</h3>
              <button style={S.closeButton} onClick={() => setSelectedLog(null)}>×</button>
            </div>
            <div style={S.detailGrid}>
              <Detail label="ID" value={selectedLog.id} />
              <Detail label="Action" value={ACTION_META[selectedLog.actionType]?.label || selectedLog.actionType} />
              <Detail label="Performed By" value={selectedLog.performedBy} />
              <Detail label="Target" value={selectedLog.targetName} />
              <Detail label="Target Type" value={selectedLog.targetType} />
              <Detail label="Date" value={selectedLog.dateTime} />
              <Detail label="Severity" value={selectedLog.severity} />
              <Detail label="Description" value={selectedLog.description} />
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
      <div style={{ fontSize: 14, fontWeight: 600, color: "#111827", wordBreak: "break-word" }}>{value}</div>
    </div>
  );
}

const S: Record<string, any> = {
  errorCard: {
    marginBottom: 16,
    color: "#991B1B",
    background: "#FEF2F2",
    border: "1px solid #FECACA",
  },
  summaryGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(5, 1fr)",
    gap: 16,
    marginBottom: 24,
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
  dateHeader: {
    minWidth: 118,
  },
  dateCell: {
    minWidth: 118,
    whiteSpace: "nowrap",
  },
  dateText: {
    color: "#111827",
    fontSize: 14,
    fontWeight: 600,
    fontVariantNumeric: "tabular-nums",
  },
  timeText: {
    color: "#6B7280",
    fontSize: 12,
    fontWeight: 500,
    fontVariantNumeric: "tabular-nums",
    marginTop: 3,
  },
  viewButton: {
    border: "1px solid #E5E7EB",
    background: "#FFFFFF",
    borderRadius: 8,
    padding: "6px 12px",
    cursor: "pointer",
    fontSize: 12,
    fontWeight: 600,
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
  detailGrid: {
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
};
