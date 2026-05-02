import { useEffect, useMemo, useState } from "react";
import type { LenderSession } from "../lib/lender-session";
import { LenderAgreementsApi, type LenderLegalDocument } from "../lib/lender-agreements-api";

type AgreementsPageProps = {
  session: LenderSession;
};

export default function AgreementsPage({ session }: AgreementsPageProps) {
  const [records, setRecords] = useState<LenderLegalDocument[]>([]);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadAgreements() {
      try {
        const response = await LenderAgreementsApi.getLegalAgreements();
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
        record.borrower.fullName.toLowerCase().includes(searchValue);
      
      const matchesStatus = filterStatus === "all" || record.status === filterStatus;
      
      return matchesSearch && matchesStatus;
    });
  }, [filterStatus, records, search]);

  function handleDownload(documentId: string, pdfDownloadPath?: string) {
    const token = session.accessToken;
    if (!token) return;
    
    // Assuming API_BASE_URL is configured appropriately in apiClient
    const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL as string | undefined)?.replace(/\/$/, "") ?? "/api";
    
    const path = pdfDownloadPath ?? `/legal/documents/${documentId}/download`;
    const fullUrl = `${API_BASE_URL}${path}?token=${encodeURIComponent(token)}`;
    
    window.open(fullUrl, "_blank");
  }

  const counts = {
    all: records.length,
    fullyAccepted: records.filter(r => r.status === "fully_accepted").length,
    pending: records.filter(r => r.status !== "fully_accepted").length,
  };

  return (
    <section className="dashboard-panel">
      <header className="page-header">
        <div>
          <p className="eyebrow">Legal</p>
          <h1 className="page-title">My Agreements</h1>
          <p className="page-subtitle">View and download legal agreements for your loans.</p>
        </div>
        <div className="header-date">
          <span className="badge badge-success">{counts.fullyAccepted} Active</span>
        </div>
      </header>

      {error ? (
        <section className="card error-card">
          <h2>Failed to load agreements</h2>
          <p>{error}</p>
        </section>
      ) : (
        <>
          <section className="summary-grid" aria-label="Agreements summary">
            <article className="card metric-card">
              <div className="metric-icon metric-icon--primary" aria-hidden="true">TOT</div>
              <div className="metric-copy">
                <p className="metric-label">Total</p>
                <p className="metric-value">{loading ? "..." : counts.all}</p>
              </div>
            </article>
            <article className="card metric-card">
              <div className="metric-icon metric-icon--success" aria-hidden="true">ACT</div>
              <div className="metric-copy">
                <p className="metric-label">Fully Accepted</p>
                <p className="metric-value">{loading ? "..." : counts.fullyAccepted}</p>
              </div>
            </article>
            <article className="card metric-card">
              <div className="metric-icon metric-icon--warning" aria-hidden="true">PND</div>
              <div className="metric-copy">
                <p className="metric-label">Pending Signatures</p>
                <p className="metric-value">{loading ? "..." : counts.pending}</p>
              </div>
            </article>
          </section>

          <section className="card borrowers-card">
            <div className="borrowers-toolbar">
              <div className="tabs" style={{ display: 'flex', gap: '8px' }}>
                {(["all", "fully_accepted", "partially_accepted", "generated"] as const).map((status) => (
                  <button 
                    key={status} 
                    className={`tab ${filterStatus === status ? "active" : ""}`} 
                    onClick={() => setFilterStatus(status)}
                    style={{ 
                      padding: '6px 12px', 
                      borderRadius: '6px', 
                      border: '1px solid #e2e8f0',
                      background: filterStatus === status ? '#f1f5f9' : 'transparent',
                      cursor: 'pointer'
                    }}
                  >
                    {status.replace("_", " ")}
                  </button>
                ))}
              </div>
              <form className="search-field" onSubmit={(e) => e.preventDefault()}>
                <input
                  type="search"
                  className="input"
                  placeholder="Search by Loan ID or Borrower..."
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  aria-label="Search agreements"
                />
              </form>
            </div>

            <div className="table-container">
              <table className="dashboard-table">
                <thead>
                  <tr>
                    <th>Loan ID</th>
                    <th>Borrower</th>
                    <th>Status</th>
                    <th>Updated</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr>
                      <td className="table-empty" colSpan={5}>
                        Loading agreements...
                      </td>
                    </tr>
                  ) : filtered.length > 0 ? (
                    filtered.map((record) => (
                      <tr key={record.id} className="dashboard-table__row">
                        <td>
                          <span style={{ fontFamily: 'monospace', fontSize: '12px' }}>{record.loanId}</span>
                        </td>
                        <td>
                          <div className="borrower-cell">
                            <div>
                              <p className="borrower-name">{record.borrower.fullName}</p>
                              <p className="borrower-email">{record.borrower.email}</p>
                            </div>
                          </div>
                        </td>
                        <td>
                          <span className={`badge ${record.status === 'fully_accepted' ? 'badge-success' : record.status === 'partially_accepted' ? 'badge-warning' : 'badge-gray'}`}>
                            {record.status.replace("_", " ")}
                          </span>
                        </td>
                        <td>
                          {new Date(record.updatedAt).toLocaleDateString()}
                        </td>
                        <td>
                          <button
                            className="dashboard-quick-action"
                            style={{ width: '32px', height: '32px', borderRadius: '6px' }}
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDownload(record.id, record.pdfDownloadPath);
                            }}
                            title="Download PDF"
                          >
                            <span className="dashboard-quick-action__symbol">↓</span>
                          </button>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td className="table-empty" colSpan={5}>
                        No agreements found.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>
        </>
      )}
    </section>
  );
}
