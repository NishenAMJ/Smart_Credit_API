import { useEffect, useMemo, useState } from "react";
import { Search, Download, FileText, CheckCircle2, Clock3 } from "lucide-react";
import type { AgreementsPageProps, SharedLegalDocument, AgreementStatus } from "./types";
import "./AgreementsPage.css";

export default function AgreementsPage({
  role,
  fetcher,
  onDownload,
  title = "Legal Agreements",
  subtitle = "Manage and track loan agreements across the platform.",
}: AgreementsPageProps) {
  const [records, setRecords] = useState<SharedLegalDocument[]>([]);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState<AgreementStatus | "all">("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadData() {
      setLoading(true);
      try {
        const response = await fetcher();
        setRecords(response.documents || []);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load agreements.");
      } finally {
        setLoading(false);
      }
    }

    void loadData();
  }, [fetcher]);

  const filtered = useMemo(() => {
    return records.filter((record) => {
      const searchValue = search.toLowerCase();
      const matchesSearch =
        record.loanId.toLowerCase().includes(searchValue) ||
        record.id.toLowerCase().includes(searchValue) ||
        record.borrower.fullName.toLowerCase().includes(searchValue) ||
        record.lender.fullName.toLowerCase().includes(searchValue);

      const matchesStatus = filterStatus === "all" || record.status === filterStatus;

      return matchesSearch && matchesStatus;
    });
  }, [filterStatus, records, search]);

  const stats = useMemo(() => {
    const counts = {
      all: records.length,
      fullyAccepted: records.filter((r) => r.status === "fully_accepted").length,
      pending: records.filter((r) => r.status !== "fully_accepted").length,
    };
    return counts;
  }, [records]);

  if (error) {
    return (
      <div className="agreements-container">
        <div className="card" style={{ border: "1px solid #feb2b2", background: "#fff5f5", color: "#c53030", padding: 20, borderRadius: 12 }}>
          <h2 style={{ fontSize: 18, marginBottom: 8 }}>Unable to load agreements</h2>
          <p>{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="agreements-container">
      <header className="page-header">
        <div>
          <h1 className="page-title">{title}</h1>
          <p className="page-subtitle">{subtitle}</p>
        </div>
        {role === "admin" && (
          <div className="badge badge-fully_accepted" style={{ padding: "8px 16px" }}>
            <CheckCircle2 size={14} style={{ marginRight: 6 }} />
            {stats.fullyAccepted} Active Agreements
          </div>
        )}
      </header>

      <section className="summary-grid">
        <div className="summary-card">
          <p className="summary-label">Total Documents</p>
          <p className="summary-value">{loading ? "..." : stats.all}</p>
          <div style={{ marginTop: 12, display: "flex", alignItems: "center", gap: 6, color: "#64748b", fontSize: 12 }}>
             <FileText size={14} /> Global repository
          </div>
        </div>
        <div className="summary-card">
          <p className="summary-label">Fully Signed</p>
          <p className="summary-value" style={{ color: "#10b981" }}>{loading ? "..." : stats.fullyAccepted}</p>
          <div style={{ marginTop: 12, display: "flex", alignItems: "center", gap: 6, color: "#10b981", fontSize: 12 }}>
             <CheckCircle2 size={14} /> Ready for disbursement
          </div>
        </div>
        <div className="summary-card">
          <p className="summary-label">Awaiting Signatures</p>
          <p className="summary-value" style={{ color: "#f59e0b" }}>{loading ? "..." : stats.pending}</p>
          <div style={{ marginTop: 12, display: "flex", alignItems: "center", gap: 6, color: "#f59e0b", fontSize: 12 }}>
             <Clock3 size={14} /> Action required
          </div>
        </div>
      </section>

      <div className="toolbar">
        <div className="search-wrapper">
          <Search size={18} className="search-icon" />
          <input
            className="search-input"
            placeholder="Search by Loan ID, Party Name..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <div className="tabs-container">
          {(["all", "fully_accepted", "partially_accepted", "generated"] as const).map((status) => (
            <button
              key={status}
              className={`tab-btn ${filterStatus === status ? "active" : ""}`}
              onClick={() => setFilterStatus(status)}
            >
              {status === "all" ? "All" : status.replace("_", " ")}
            </button>
          ))}
        </div>
      </div>

      <div className="table-wrapper">
        <table className="agreements-table">
          <thead>
            <tr>
              <th>Loan ID</th>
              <th>Borrower</th>
              {role === "admin" && <th>Lender</th>}
              <th>Status</th>
              <th>Last Updated</th>
              <th style={{ textAlign: "center" }}>Action</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={role === "admin" ? 6 : 5}>
                  <div className="empty-state">Loading agreements...</div>
                </td>
              </tr>
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan={role === "admin" ? 6 : 5}>
                  <div className="empty-state">No agreements matching your criteria.</div>
                </td>
              </tr>
            ) : (
              filtered.map((record) => (
                <tr key={record.id}>
                  <td className="mono">{record.loanId}</td>
                  <td>
                    <div className="user-info">
                      <span className="user-name">{record.borrower.fullName}</span>
                      <span className="user-email">{record.borrower.email}</span>
                    </div>
                  </td>
                  {role === "admin" && (
                    <td>
                      <div className="user-info">
                        <span className="user-name">{record.lender.fullName}</span>
                        <span className="user-email">{record.lender.email}</span>
                      </div>
                    </td>
                  )}
                  <td>
                    <span className={`badge badge-${record.status}`}>
                      {record.status.replace("_", " ")}
                    </span>
                  </td>
                  <td style={{ color: "#64748b", fontSize: 13 }}>
                    {new Date(record.updatedAt).toLocaleDateString(undefined, {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    })}
                  </td>
                  <td>
                    <div style={{ display: "flex", justifyContent: "center" }}>
                      <button
                        className="download-btn"
                        onClick={() => onDownload(record.id, record.pdfDownloadPath)}
                        title="Download Agreement PDF"
                      >
                        <Download size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
