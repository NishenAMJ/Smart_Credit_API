import { useEffect, useMemo, useState } from "react";
import { Search, Download } from "lucide-react";
import { getLegalAgreements, getApiBaseUrl, type AdminLegalDocument } from "../../lib/api";
import { getAdminToken } from "../../lib/auth";
import type { CSSProperties } from "react";

export default function LegalAgreements() {
  const [records, setRecords] = useState<AdminLegalDocument[]>([]);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadAgreements() {
      try {
        const response = await getLegalAgreements();
        setRecords(response.documents || []);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load legal agreements.");
      } finally {
        setLoading(false);
      }
    }

    void loadAgreements();
  }, []);

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

  function handleDownload(documentId: string, pdfDownloadPath?: string) {
    const token = getAdminToken();
    if (!token) return;
    
    const path = pdfDownloadPath ?? `/api/legal/documents/${documentId}/download`;
    const url = `${getApiBaseUrl().replace('/api', '')}${path}?token=${encodeURIComponent(token)}`;
    
    window.open(url, "_blank");
  }

  const counts = {
    all: records.length,
    fullyAccepted: records.filter(r => r.status === "fully_accepted").length,
    pending: records.filter(r => r.status !== "fully_accepted").length,
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Legal Agreements</h1>
          <p className="page-subtitle">View and download all generated loan agreements in the platform.</p>
        </div>
        <span style={S.activeChip}>{counts.fullyAccepted} Active</span>
      </div>

      {error && <div className="card" style={S.errorCard}>{error}</div>}

      <div style={S.summaryGrid}>
        {[
          { label: "Total Agreements", count: counts.all, color: "#007AFF" },
          { label: "Fully Accepted", count: counts.fullyAccepted, color: "#10B981" },
          { label: "Pending Signatures", count: counts.pending, color: "#F59E0B" },
        ].map((item) => (
          <div key={item.label} className="card" style={S.summaryCard}>
            <p style={{ fontSize: 13, color: "#6B7280", fontWeight: 500 }}>{item.label}</p>
            <p style={{ fontSize: 28, fontWeight: 700, color: item.color, marginTop: 4 }}>
              {loading ? "..." : item.count}
            </p>
          </div>
        ))}
      </div>

      <div style={S.filtersRow}>
        <div style={{ position: "relative", flex: 1, maxWidth: 320 }}>
          <Search size={15} style={S.searchIcon} />
          <input
            className="input"
            placeholder="Search by Loan ID, Borrower, Lender..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ paddingLeft: 36 }}
          />
        </div>

        <div className="tabs">
          {(["all", "fully_accepted", "partially_accepted", "generated"] as const).map((status) => (
            <button key={status} className={`tab ${filterStatus === status ? "active" : ""}`} onClick={() => setFilterStatus(status)}>
              {status.replace("_", " ")}
            </button>
          ))}
        </div>
      </div>

      <div className="table-container">
        <table>
          <thead>
            <tr>
              <th>Loan ID</th>
              <th>Borrower</th>
              <th>Lender</th>
              <th>Status</th>
              <th>Updated</th>
              <th style={{ textAlign: "center" }}>Action</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={6} style={S.emptyCell}>
                  {loading ? "Loading agreements..." : "No agreements found."}
                </td>
              </tr>
            ) : (
              filtered.map((record) => (
                <tr key={record.id}>
                  <td style={S.monoCell}>{record.loanId}</td>
                  <td>
                    <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                      <span style={{ fontWeight: 600 }}>{record.borrower.fullName}</span>
                      <span style={{ fontSize: 12, color: "#6B7280" }}>{record.borrower.email}</span>
                    </div>
                  </td>
                  <td>
                    <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                      <span style={{ fontWeight: 600 }}>{record.lender.fullName}</span>
                      <span style={{ fontSize: 12, color: "#6B7280" }}>{record.lender.email}</span>
                    </div>
                  </td>
                  <td>
                    <span className={`badge ${record.status === 'fully_accepted' ? 'badge-success' : record.status === 'partially_accepted' ? 'badge-warning' : ''}`}>
                      {record.status.replace("_", " ")}
                    </span>
                  </td>
                  <td>{new Date(record.updatedAt).toLocaleDateString()}</td>
                  <td>
                    <div style={S.actionRow}>
                      <button style={iconButton("#007AFF", "#EFF6FF")} onClick={() => handleDownload(record.id, record.pdfDownloadPath)} title="Download PDF">
                        <Download size={14} />
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

function iconButton(color: string, bg: string): CSSProperties {
  return {
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
  };
}

const S: Record<string, CSSProperties> = {
  activeChip: {
    background: "#ECFDF5",
    color: "#065F46",
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
    gridTemplateColumns: "repeat(3, 1fr)",
    gap: 16,
    marginBottom: 24,
  },
  summaryCard: {
    display: "flex",
    flexDirection: "column",
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
  monoCell: {
    fontFamily: "monospace",
    fontSize: 12,
    color: "#6B7280",
  },
  actionRow: {
    display: "flex",
    gap: 6,
    justifyContent: "center",
  },
};
