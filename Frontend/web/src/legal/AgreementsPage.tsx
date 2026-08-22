import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Copy,
  Download,
  Eye,
  FileText,
  Search,
  X,
} from "lucide-react";
import type { AgreementsPageProps, SharedLegalDocument } from "./types";
import "./AgreementsPage.css";

type AgreementFilter =
  | "all"
  | "needs_signature"
  | "awaiting_disbursement"
  | "fully_signed"
  | "failed";
type AgreementSort = "newest" | "oldest" | "status";

const PAGE_SIZE = 10;
const FILTERS: Array<{ value: AgreementFilter; label: string }> = [
  { value: "all", label: "All" },
  { value: "needs_signature", label: "Needs signature" },
  { value: "awaiting_disbursement", label: "Awaiting disbursement" },
  { value: "fully_signed", label: "Fully signed" },
  { value: "failed", label: "Failed" },
];

function formatDate(value: string | null, includeTime = false) {
  if (!value) return "Not available";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Not available";
  return new Intl.DateTimeFormat("en-LK", {
    year: "numeric",
    month: "short",
    day: "numeric",
    ...(includeTime ? { hour: "2-digit", minute: "2-digit" } : {}),
  }).format(date);
}

function formatMoney(minor: number, currency: string) {
  return new Intl.NumberFormat("en-LK", {
    style: "currency",
    currency,
    maximumFractionDigits: 2,
  }).format(minor / 100);
}

function shortId(value: string) {
  if (value.length <= 18) return value;
  return `${value.slice(0, 9)}…${value.slice(-6)}`;
}

function signatureCount(record: SharedLegalDocument) {
  return (
    Number(record.lenderAcceptance.accepted) +
    Number(record.borrowerAcceptance.accepted)
  );
}

function statusPresentation(record: SharedLegalDocument) {
  if (record.status === "finalization_failed") {
    return { label: "Finalization failed", tone: "danger" };
  }
  if (record.status === "cancelled") {
    return { label: "Cancelled", tone: "danger" };
  }
  if (record.status === "superseded") {
    return { label: "Superseded", tone: "neutral" };
  }
  if (record.status === "fully_accepted") {
    return { label: "Fully signed", tone: "success" };
  }
  if (record.status === "finalizing") {
    return { label: "Finalizing document", tone: "info" };
  }
  if (record.status === "awaiting_disbursement") {
    return { label: "Awaiting disbursement", tone: "info" };
  }
  if (!record.lenderAcceptance.accepted) {
    return { label: "Awaiting lender", tone: "warning" };
  }
  if (!record.borrowerAcceptance.accepted) {
    return { label: "Awaiting borrower", tone: "warning" };
  }
  return {
    label: record.status.replaceAll("_", " "),
    tone: "neutral",
  };
}

function matchesFilter(record: SharedLegalDocument, filter: AgreementFilter) {
  if (filter === "all") return true;
  if (filter === "needs_signature") {
    return [
      "awaiting_signatures",
      "awaiting_borrower_signature",
      "partially_accepted",
    ].includes(record.status);
  }
  if (filter === "awaiting_disbursement") {
    return ["awaiting_disbursement", "finalizing"].includes(record.status);
  }
  if (filter === "fully_signed") return record.status === "fully_accepted";
  return ["finalization_failed", "cancelled"].includes(record.status);
}

function CopyableId({
  label,
  value,
  copiedValue,
  onCopy,
}: {
  label: string;
  value: string;
  copiedValue: string;
  onCopy: (value: string) => void;
}) {
  return (
    <div className="agreement-copy-row">
      <div>
        <span>{label}</span>
        <strong title={value}>{value}</strong>
      </div>
      <button
        type="button"
        aria-label={`Copy ${label}`}
        title={copiedValue === value ? "Copied" : `Copy ${label}`}
        onClick={() => onCopy(value)}
      >
        {copiedValue === value ? (
          <CheckCircle2 size={15} />
        ) : (
          <Copy size={15} />
        )}
      </button>
    </div>
  );
}

export default function AgreementsPage({
  role,
  fetcher,
  onDownload,
  title = "Legal Agreements",
  subtitle = "Manage and track loan agreements across the platform.",
}: AgreementsPageProps) {
  const [records, setRecords] = useState<SharedLegalDocument[]>([]);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<AgreementFilter>("all");
  const [sort, setSort] = useState<AgreementSort>("newest");
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<SharedLegalDocument | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [copiedValue, setCopiedValue] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadData() {
      setLoading(true);
      try {
        const response = await fetcher();
        setRecords(response.documents || []);
        setError("");
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Failed to load agreements.",
        );
      } finally {
        setLoading(false);
      }
    }

    void loadData();
  }, [fetcher]);

  useEffect(() => {
    setPage(1);
    setSelected(null);
  }, [filter, search, sort]);

  useEffect(() => {
    if (!selected) return;
    const previousOverflow = document.body.style.overflow;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setSelected(null);
        setShowPreview(false);
      }
    };
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", closeOnEscape);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", closeOnEscape);
    };
  }, [selected]);

  const stats = useMemo(
    () => ({
      all: records.length,
      fullySigned: records.filter((record) =>
        matchesFilter(record, "fully_signed"),
      ).length,
      needsSignature: records.filter((record) =>
        matchesFilter(record, "needs_signature"),
      ).length,
    }),
    [records],
  );

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    return records
      .filter((record) => {
        const matchesSearch =
          !query ||
          record.loanId.toLowerCase().includes(query) ||
          record.id.toLowerCase().includes(query) ||
          record.borrower.fullName.toLowerCase().includes(query) ||
          record.borrower.email.toLowerCase().includes(query) ||
          record.lender.fullName.toLowerCase().includes(query) ||
          record.lender.email.toLowerCase().includes(query);
        return matchesSearch && matchesFilter(record, filter);
      })
      .sort((left, right) => {
        if (sort === "status") {
          return statusPresentation(left).label.localeCompare(
            statusPresentation(right).label,
          );
        }
        const difference =
          new Date(right.updatedAt).getTime() -
          new Date(left.updatedAt).getTime();
        return sort === "newest" ? difference : -difference;
      });
  }, [filter, records, search, sort]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const visibleRecords = filtered.slice(
    (page - 1) * PAGE_SIZE,
    page * PAGE_SIZE,
  );

  async function copyValue(value: string) {
    try {
      await navigator.clipboard.writeText(value);
      setCopiedValue(value);
      window.setTimeout(() => setCopiedValue(""), 1600);
    } catch {
      setCopiedValue("");
    }
  }

  function openAgreement(record: SharedLegalDocument) {
    setSelected(record);
    setShowPreview(false);
  }

  if (error) {
    return (
      <div className="agreements-container">
        <div className="agreements-error" role="alert">
          <AlertTriangle size={20} />
          <div>
            <h2>Unable to load agreements</h2>
            <p>{error}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="agreements-container">
      <header className="agreements-header">
        <div>
          <h1>{title}</h1>
          <p>{subtitle}</p>
        </div>
      </header>

      <section className="agreements-summary" aria-label="Agreement totals">
        <button
          type="button"
          className={filter === "all" ? "is-active" : ""}
          onClick={() => setFilter("all")}
        >
          <span className="agreements-summary__icon agreements-summary__icon--all">
            <FileText size={19} />
          </span>
          <span>
            <small>Total agreements</small>
            <strong>{loading ? "—" : stats.all}</strong>
            <em>Loaded repository</em>
          </span>
        </button>
        <button
          type="button"
          className={filter === "fully_signed" ? "is-active" : ""}
          onClick={() => setFilter("fully_signed")}
        >
          <span className="agreements-summary__icon agreements-summary__icon--signed">
            <CheckCircle2 size={19} />
          </span>
          <span>
            <small>Fully signed</small>
            <strong>{loading ? "—" : stats.fullySigned}</strong>
            <em>Agreement completed</em>
          </span>
        </button>
        <button
          type="button"
          className={filter === "needs_signature" ? "is-active" : ""}
          onClick={() => setFilter("needs_signature")}
        >
          <span className="agreements-summary__icon agreements-summary__icon--pending">
            <Clock3 size={19} />
          </span>
          <span>
            <small>Needs signature</small>
            <strong>{loading ? "—" : stats.needsSignature}</strong>
            <em>Participant action required</em>
          </span>
        </button>
      </section>

      <section className="agreements-toolbar">
        <label className="agreements-search">
          <Search size={18} />
          <input
            placeholder="Search agreement, loan, borrower, or lender"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </label>
        <label className="agreements-sort">
          <span>Sort</span>
          <select
            value={sort}
            onChange={(event) => setSort(event.target.value as AgreementSort)}
          >
            <option value="newest">Newest updated</option>
            <option value="oldest">Oldest updated</option>
            <option value="status">Status</option>
          </select>
        </label>
      </section>

      <nav className="agreements-tabs" aria-label="Filter agreements">
        {FILTERS.map((option) => (
          <button
            key={option.value}
            type="button"
            className={filter === option.value ? "is-active" : ""}
            aria-pressed={filter === option.value}
            onClick={() => setFilter(option.value)}
          >
            {option.label}
          </button>
        ))}
      </nav>

      <section className="agreements-table-card">
        <div className="agreements-table-scroll">
          <table className="agreements-table">
            <colgroup>
              <col className="agreements-col-id" />
              <col className="agreements-col-party" />
              {role === "admin" ? (
                <col className="agreements-col-party" />
              ) : null}
              <col className="agreements-col-signatures" />
              <col className="agreements-col-status" />
              <col className="agreements-col-date" />
            </colgroup>
            <thead>
              <tr>
                <th>Agreement</th>
                <th>Borrower</th>
                {role === "admin" ? <th>Lender</th> : null}
                <th>Signatures</th>
                <th>Status</th>
                <th>Updated</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={role === "admin" ? 6 : 5}>
                    <div className="agreements-empty">Loading agreements…</div>
                  </td>
                </tr>
              ) : visibleRecords.length === 0 ? (
                <tr>
                  <td colSpan={role === "admin" ? 6 : 5}>
                    <div className="agreements-empty">
                      <FileText size={26} />
                      <strong>No agreements found</strong>
                      <span>Try another search or status filter.</span>
                    </div>
                  </td>
                </tr>
              ) : (
                visibleRecords.map((record) => {
                  const status = statusPresentation(record);
                  const signed = signatureCount(record);
                  return (
                    <tr
                      key={record.id}
                      tabIndex={0}
                      onClick={() => openAgreement(record)}
                      onKeyDown={(event) => {
                        if (event.key === "Enter" || event.key === " ") {
                          event.preventDefault();
                          openAgreement(record);
                        }
                      }}
                    >
                      <td>
                        <div className="agreement-id-cell">
                          <strong title={record.id}>
                            {shortId(record.id)}
                          </strong>
                          <span title={record.loanId}>
                            Loan {shortId(record.loanId)}
                          </span>
                          <button
                            type="button"
                            title="Copy agreement ID"
                            aria-label="Copy agreement ID"
                            onClick={(event) => {
                              event.stopPropagation();
                              void copyValue(record.id);
                            }}
                          >
                            {copiedValue === record.id ? (
                              <CheckCircle2 size={14} />
                            ) : (
                              <Copy size={14} />
                            )}
                          </button>
                        </div>
                      </td>
                      <td>
                        <div className="agreement-party">
                          <strong>{record.borrower.fullName}</strong>
                          <span>{record.borrower.email}</span>
                        </div>
                      </td>
                      {role === "admin" ? (
                        <td>
                          <div className="agreement-party">
                            <strong>{record.lender.fullName}</strong>
                            <span>{record.lender.email}</span>
                          </div>
                        </td>
                      ) : null}
                      <td>
                        <div className="agreement-signature-progress">
                          <strong>{signed} of 2 signed</strong>
                          <span>
                            <i
                              className={
                                record.lenderAcceptance.accepted
                                  ? "is-complete"
                                  : ""
                              }
                            />
                            <i
                              className={
                                record.borrowerAcceptance.accepted
                                  ? "is-complete"
                                  : ""
                              }
                            />
                          </span>
                        </div>
                      </td>
                      <td>
                        <span
                          className={`agreement-status agreement-status--${status.tone}`}
                        >
                          {status.label}
                        </span>
                      </td>
                      <td>
                        <time>{formatDate(record.updatedAt)}</time>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {!loading && filtered.length > 0 ? (
          <footer className="agreements-pagination">
            <span>
              Showing {(page - 1) * PAGE_SIZE + 1}–
              {Math.min(page * PAGE_SIZE, filtered.length)} of {filtered.length}
            </span>
            <div>
              <button
                type="button"
                disabled={page <= 1}
                onClick={() => setPage((current) => Math.max(1, current - 1))}
              >
                <ChevronLeft size={16} /> Previous
              </button>
              <strong>
                Page {page} of {pageCount}
              </strong>
              <button
                type="button"
                disabled={page >= pageCount}
                onClick={() =>
                  setPage((current) => Math.min(pageCount, current + 1))
                }
              >
                Next <ChevronRight size={16} />
              </button>
            </div>
          </footer>
        ) : null}
      </section>

      {selected ? (
        <div
          className="agreement-modal-backdrop"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              setSelected(null);
              setShowPreview(false);
            }
          }}
        >
          <section
            className="agreement-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="agreement-modal-title"
          >
            <header className="agreement-modal__header">
              <div>
                <span>Agreement details</span>
                <h2 id="agreement-modal-title">{selected.title}</h2>
                <p>
                  Version {selected.version} · Updated{" "}
                  {formatDate(selected.updatedAt)}
                </p>
              </div>
              <button
                type="button"
                aria-label="Close agreement details"
                onClick={() => {
                  setSelected(null);
                  setShowPreview(false);
                }}
              >
                <X size={19} />
              </button>
            </header>

            <div className="agreement-modal__body">
              <section className="agreement-detail-overview">
                <div>
                  <span
                    className={`agreement-status agreement-status--${statusPresentation(selected).tone}`}
                  >
                    {statusPresentation(selected).label}
                  </span>
                  <strong>{signatureCount(selected)} of 2 signatures</strong>
                  {selected.legacyReadOnly ? <em>Legacy read-only</em> : null}
                </div>
                <div className="agreement-detail-actions">
                  <button
                    type="button"
                    onClick={() => setShowPreview((current) => !current)}
                  >
                    <Eye size={16} />
                    {showPreview ? "Hide preview" : "Preview agreement"}
                  </button>
                  <button
                    type="button"
                    className="is-primary"
                    disabled={!selected.pdfAvailable}
                    title={
                      selected.pdfAvailable
                        ? "Download signed agreement PDF"
                        : "The signed PDF is not ready yet"
                    }
                    onClick={() =>
                      onDownload(selected.id, selected.pdfDownloadPath)
                    }
                  >
                    <Download size={16} />
                    {selected.pdfAvailable ? "Download PDF" : "PDF not ready"}
                  </button>
                </div>
              </section>

              {showPreview ? (
                <section className="agreement-document-preview">
                  <iframe
                    sandbox=""
                    srcDoc={selected.htmlContent}
                    title={`Preview of ${selected.title}`}
                  />
                </section>
              ) : null}

              <section className="agreement-detail-section">
                <h3>References</h3>
                <div className="agreement-reference-grid">
                  <CopyableId
                    label="Agreement ID"
                    value={selected.id}
                    copiedValue={copiedValue}
                    onCopy={(value) => void copyValue(value)}
                  />
                  <CopyableId
                    label="Loan ID"
                    value={selected.loanId}
                    copiedValue={copiedValue}
                    onCopy={(value) => void copyValue(value)}
                  />
                  {selected.applicationId ? (
                    <CopyableId
                      label="Application ID"
                      value={selected.applicationId}
                      copiedValue={copiedValue}
                      onCopy={(value) => void copyValue(value)}
                    />
                  ) : null}
                  {selected.listingId ? (
                    <CopyableId
                      label="Listing ID"
                      value={selected.listingId}
                      copiedValue={copiedValue}
                      onCopy={(value) => void copyValue(value)}
                    />
                  ) : null}
                </div>
              </section>

              <section className="agreement-detail-section">
                <h3>Signature progress</h3>
                <div className="agreement-signers">
                  {[
                    {
                      party: selected.lender,
                      acceptance: selected.lenderAcceptance,
                    },
                    {
                      party: selected.borrower,
                      acceptance: selected.borrowerAcceptance,
                    },
                  ].map(({ party, acceptance }) => (
                    <article key={party.userId}>
                      <div>
                        <span>{party.role}</span>
                        <strong>{party.fullName}</strong>
                        <small>{party.email}</small>
                      </div>
                      <div
                        className={
                          acceptance.accepted
                            ? "agreement-signature-state is-signed"
                            : "agreement-signature-state"
                        }
                      >
                        {acceptance.accepted ? (
                          <CheckCircle2 size={17} />
                        ) : (
                          <Clock3 size={17} />
                        )}
                        <span>
                          <strong>
                            {acceptance.accepted ? "Signed" : "Pending"}
                          </strong>
                          <small>
                            {acceptance.accepted
                              ? `${acceptance.signedName || party.fullName} · ${formatDate(acceptance.acceptedAt, true)}`
                              : "Signature not received"}
                          </small>
                        </span>
                      </div>
                    </article>
                  ))}
                </div>
              </section>

              <section className="agreement-detail-section">
                <h3>Loan terms</h3>
                <div className="agreement-terms-grid">
                  <div>
                    <span>Principal</span>
                    <strong>
                      {formatMoney(
                        selected.terms.principalMinor,
                        selected.terms.currency,
                      )}
                    </strong>
                  </div>
                  <div>
                    <span>Interest rate</span>
                    <strong>{selected.terms.annualInterestRate}% yearly</strong>
                  </div>
                  <div>
                    <span>Total repayable</span>
                    <strong>
                      {formatMoney(
                        selected.terms.totalRepayableMinor,
                        selected.terms.currency,
                      )}
                    </strong>
                  </div>
                  <div>
                    <span>Monthly payment</span>
                    <strong>
                      {formatMoney(
                        selected.terms.monthlyInstallmentMinor,
                        selected.terms.currency,
                      )}
                    </strong>
                  </div>
                  <div>
                    <span>Tenure</span>
                    <strong>{selected.terms.tenureMonths} months</strong>
                  </div>
                  <div>
                    <span>Disbursement</span>
                    <strong>
                      {selected.disbursementConfirmation.confirmed
                        ? `Confirmed ${formatDate(selected.disbursementConfirmation.confirmedAt)}`
                        : "Not confirmed"}
                    </strong>
                  </div>
                </div>
              </section>

              <section className="agreement-detail-section">
                <h3>Agreement activity</h3>
                <div className="agreement-activity">
                  <div>
                    <i />
                    <span>
                      <strong>Agreement generated</strong>
                      <small>{formatDate(selected.generatedAt, true)}</small>
                    </span>
                  </div>
                  {selected.lenderAcceptance.acceptedAt ? (
                    <div>
                      <i />
                      <span>
                        <strong>Lender signed</strong>
                        <small>
                          {formatDate(
                            selected.lenderAcceptance.acceptedAt,
                            true,
                          )}
                        </small>
                      </span>
                    </div>
                  ) : null}
                  {selected.disbursementConfirmation.confirmedAt ? (
                    <div>
                      <i />
                      <span>
                        <strong>Disbursement confirmed</strong>
                        <small>
                          {formatDate(
                            selected.disbursementConfirmation.confirmedAt,
                            true,
                          )}
                        </small>
                      </span>
                    </div>
                  ) : null}
                  {selected.borrowerAcceptance.acceptedAt ? (
                    <div>
                      <i />
                      <span>
                        <strong>Borrower signed</strong>
                        <small>
                          {formatDate(
                            selected.borrowerAcceptance.acceptedAt,
                            true,
                          )}
                        </small>
                      </span>
                    </div>
                  ) : null}
                  {selected.signedPdfGeneratedAt ? (
                    <div>
                      <i />
                      <span>
                        <strong>Signed PDF generated</strong>
                        <small>
                          {formatDate(selected.signedPdfGeneratedAt, true)}
                        </small>
                      </span>
                    </div>
                  ) : null}
                </div>
              </section>
            </div>
          </section>
        </div>
      ) : null}
    </div>
  );
}
