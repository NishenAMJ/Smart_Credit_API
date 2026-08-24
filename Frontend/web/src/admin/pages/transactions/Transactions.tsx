import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type CSSProperties,
} from "react";
import {
  Activity,
  CheckCircle2,
  Clock3,
  RefreshCw,
  Search,
  XCircle,
  ChevronLeft,
  ChevronRight,
  Download,
  X,
} from "lucide-react";
import {
  getTransactions,
  getTransactionsReport,
  subscribeToTransactions,
  type AdminTransaction,
  type TransactionsReportResponse,
} from "../../lib/api";

type StatusFilter = "all" | "completed" | "pending" | "failed";
type TypeFilter = "all" | "disbursement" | "repayment" | "listing_boost";

const STATUS_FILTERS: Array<{ label: string; value: StatusFilter }> = [
  { label: "All", value: "all" },
  { label: "Completed", value: "completed" },
  { label: "Pending", value: "pending" },
  { label: "Failed", value: "failed" },
];

const PAGE_SIZE_OPTIONS = [10, 20, 50, 100] as const;

type StyleValue =
  | CSSProperties
  | ((disabled: boolean) => CSSProperties)
  | ((color: string, bg: string) => CSSProperties);

type TransactionSummaryCard = {
  label: string;
  value: string;
  helper: string;
  icon: React.ElementType;
  color: string;
  bg: string;
};

// Renders the admin transactions ledger with search, filters, and pagination.
// ADMIN: View transactions - frontend
export default function Transactions() {
  const [transactions, setTransactions] = useState<AdminTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [typeFilter, setTypeFilter] = useState<TypeFilter>("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [selectedTransaction, setSelectedTransaction] =
    useState<AdminTransaction | null>(null);
  const [report, setReport] = useState<
    TransactionsReportResponse["data"] | null
  >(null);

  // Pagination state
  const [pageSize, setPageSize] = useState<number>(10);
  const [currentPage, setCurrentPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [nextCursor, setNextCursor] = useState<string | undefined>();
  const [cursorStack, setCursorStack] = useState<string[]>([]);
  const [totalLoaded, setTotalLoaded] = useState(0);

  const loadTransactions = useCallback(
    async (cursor?: string) => {
      setLoading(true);
      try {
        const response = await getTransactions(pageSize, cursor);
        setTransactions(response.transactions);
        setHasMore(response.hasMore ?? false);
        setNextCursor(response.nextCursor);
        setTotalLoaded(response.count);
        setError(response.error ?? "");
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Failed to load transactions.",
        );
      } finally {
        setLoading(false);
      }
    },
    [pageSize],
  );

  const loadReport = useCallback(async () => {
    try {
      const response = await getTransactionsReport();
      setReport(response.data);
    } catch {
      // The transaction table can still be used if summary data is unavailable.
    }
  }, []);

  useEffect(() => {
    setCurrentPage(1);
    setCursorStack([]);
  }, [pageSize]);

  useEffect(() => {
    void loadReport();
  }, [loadReport]);

  useEffect(() => {
    if (currentPage !== 1) {
      return;
    }

    const source = subscribeToTransactions(
      (data) => {
        if (data.success && data.transactions) {
          setTransactions(data.transactions);
          setHasMore(
            "hasMore" in data && typeof data.hasMore === "boolean"
              ? data.hasMore
              : false,
          );
          setNextCursor(
            "nextCursor" in data && typeof data.nextCursor === "string"
              ? data.nextCursor
              : undefined,
          );
          setTotalLoaded(data.count);
          setError(data.error ?? "");
          setLoading(false);
        }
      },
      () => {
        void loadTransactions();
      },
      pageSize,
    );

    return () => source.close();
  }, [currentPage, loadTransactions, pageSize]);

  const filteredTransactions = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();

    return transactions.filter((transaction) => {
      const matchesStatus =
        statusFilter === "all" ||
        transaction.status.toLowerCase() === statusFilter;
      const matchesType =
        typeFilter === "all" || transaction.paymentType === typeFilter;
      const createdAt = transaction.createdAt
        ? new Date(transaction.createdAt)
        : null;
      const matchesFrom =
        !dateFrom ||
        Boolean(createdAt && createdAt >= new Date(`${dateFrom}T00:00:00`));
      const matchesTo =
        !dateTo ||
        Boolean(createdAt && createdAt <= new Date(`${dateTo}T23:59:59.999`));
      const matchesSearch =
        !normalizedSearch ||
        [
          transaction.transactionId,
          transaction.loanId,
          transaction.lenderId,
          transaction.lenderName,
          transaction.lenderEmail,
          transaction.borrowerId,
          transaction.borrowerName,
          transaction.borrowerEmail,
          transaction.paymentType,
          transaction.paymentMethod,
          transaction.externalReference,
          transaction.status,
        ]
          .filter(Boolean)
          .some((value) => value!.toLowerCase().includes(normalizedSearch));

      return (
        matchesStatus && matchesType && matchesFrom && matchesTo && matchesSearch
      );
    });
  }, [dateFrom, dateTo, search, statusFilter, transactions, typeFilter]);

  function handleNextPage() {
    if (!hasMore || !nextCursor) return;
    setCursorStack((prev) => [...prev, nextCursor]);
    setCurrentPage((prev) => prev + 1);
    void loadTransactions(nextCursor);
  }

  function handlePrevPage() {
    if (currentPage <= 1) return;
    const newStack = [...cursorStack];
    newStack.pop();
    const prevCursor =
      newStack.length > 0 ? newStack[newStack.length - 1] : undefined;
    setCursorStack(newStack);
    setCurrentPage((prev) => prev - 1);
    const goToCursor = currentPage <= 2 ? undefined : prevCursor;
    void loadTransactions(goToCursor);
  }

  function handlePageSizeChange(newSize: number) {
    setPageSize(newSize);
    setCurrentPage(1);
    setCursorStack([]);
  }

  const stats = useMemo(() => buildTransactionSummaryCards(report), [report]);

  function refresh() {
    setCurrentPage(1);
    setCursorStack([]);
    void Promise.all([loadTransactions(), loadReport()]);
  }

  function exportCsv() {
    const rows = filteredTransactions.map((transaction) => [
      transaction.transactionId,
      transaction.loanId ?? "",
      transaction.paymentType,
      transaction.lenderName ?? transaction.lenderId ?? "",
      transaction.borrowerName ?? transaction.borrowerId ?? "",
      transaction.amount.toFixed(2),
      transaction.status,
      transaction.paymentMethod ?? "",
      transaction.externalReference ?? "",
      transaction.createdAt ?? "",
      transaction.paidAt ?? "",
    ]);
    const csv = [
      [
        "Transaction ID",
        "Loan ID",
        "Type",
        "Lender",
        "Borrower",
        "Amount (LKR)",
        "Status",
        "Payment Method",
        "External Reference",
        "Created At",
        "Completed At",
      ],
      ...rows,
    ]
      .map((row) => row.map(csvCell).join(","))
      .join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = `transactions-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Transactions</h1>
          <p className="page-subtitle">
            Payments, repayments, lenders, and borrowers
          </p>
        </div>
      </div>

      {error && (
        <div className="card" style={S.errorCard}>
          {error}
        </div>
      )}

      <div style={S.statsGrid}>
        {stats.map((card) => {
          const Icon = card.icon;
          return (
            <div key={card.label} className="card" style={S.statCard}>
              <div style={S.statTop}>
                <div>
                  <p style={S.statLabel}>{card.label}</p>
                  <p style={S.statValue}>{card.value}</p>
                </div>
                <div style={{ ...S.iconWrap, background: card.bg }}>
                  <Icon size={18} color={card.color} />
                </div>
              </div>
              <p style={S.helperText}>{card.helper}</p>
            </div>
          );
        })}
      </div>

      <div className="card" style={S.toolbarCard}>
        <div style={S.filterArea}>
          <div className="tabs">
            {STATUS_FILTERS.map((filter) => (
              <button
                key={filter.value}
                className={`tab ${statusFilter === filter.value ? "active" : ""}`}
                onClick={() => setStatusFilter(filter.value)}
              >
                {filter.label}
              </button>
            ))}
          </div>
          <select
            className="input"
            style={S.filterSelect}
            value={typeFilter}
            onChange={(event) => setTypeFilter(event.target.value as TypeFilter)}
            aria-label="Transaction type"
          >
            <option value="all">All types</option>
            <option value="disbursement">Disbursement</option>
            <option value="repayment">Repayment</option>
            <option value="listing_boost">Ad Boost</option>
          </select>
          <input
            className="input"
            style={S.dateInput}
            type="date"
            value={dateFrom}
            onChange={(event) => setDateFrom(event.target.value)}
            aria-label="From date"
            title="From date"
          />
          <input
            className="input"
            style={S.dateInput}
            type="date"
            value={dateTo}
            min={dateFrom || undefined}
            onChange={(event) => setDateTo(event.target.value)}
            aria-label="To date"
            title="To date"
          />
        </div>

        <div style={S.toolbarRight}>
          <div className="search-wrap" style={S.searchWrap}>
            <Search className="search-icon" size={16} />
            <input
              className="input"
              placeholder="Search transactions..."
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </div>
          <button
            className="btn-secondary btn-sm"
            onClick={exportCsv}
            title="Export visible transactions"
            disabled={!filteredTransactions.length}
          >
            <Download size={15} />
            Export CSV
          </button>
          <button
            className="btn-secondary btn-sm"
            onClick={refresh}
            title="Refresh"
          >
            <RefreshCw size={15} />
          </button>
        </div>
      </div>

      <div className="table-container">
        <table>
          <thead>
            <tr>
              <th>Transaction</th>
              <th>Lender</th>
              <th>Borrower</th>
              <th>Amount</th>
              <th>Status</th>
              <th>Completed At</th>
            </tr>
          </thead>
          <tbody>
            {filteredTransactions.map((transaction) => (
              <tr
                key={transaction.id}
                onClick={() => setSelectedTransaction(transaction)}
                style={S.clickableRow}
                title="View transaction details"
              >
                <td>
                  <div style={S.primaryText}>
                    {shortTransactionReference(transaction.transactionId)}
                  </div>
                  <div style={S.secondaryText}>
                    {formatDate(transaction.createdAt)}
                  </div>
                  <div style={S.secondaryText}>
                    Loan: {transaction.loanId ?? "N/A"}
                  </div>
                </td>
                <td>
                  <PersonCell
                    name={transaction.lenderName}
                    id={transaction.lenderId}
                    email={transaction.lenderEmail}
                  />
                </td>
                <td>
                  <PersonCell
                    name={transaction.borrowerName}
                    id={transaction.borrowerId}
                    email={transaction.borrowerEmail}
                  />
                </td>
                <td>
                  <div style={S.amount}>
                    {formatCurrency(transaction.amount)}
                  </div>
                  <div style={S.secondaryText}>
                    {formatLabel(transaction.paymentType)}
                  </div>
                </td>
                <td>
                  <div style={S.statusCell}>
                    <span
                      className={`badge ${getStatusBadge(transaction.status)}`}
                    >
                      {formatLabel(transaction.status)}
                    </span>
                  </div>
                </td>
                <td>
                  <span style={S.dateText}>{formatDate(transaction.paidAt)}</span>
                </td>
              </tr>
            ))}

            {!filteredTransactions.length && (
              <tr>
                <td colSpan={6} style={S.emptyCell}>
                  {loading
                    ? "Loading transactions..."
                    : "No transactions found."}
                </td>
              </tr>
            )}
          </tbody>
        </table>

        {/* Pagination Controls */}
        <div style={S.paginationBar}>
          <div style={S.paginationInfo}>
            <span style={{ fontSize: 13, color: "#6B7280" }}>
              Showing{" "}
              {filteredTransactions.length > 0
                ? (currentPage - 1) * pageSize + 1
                : 0}
              –{(currentPage - 1) * pageSize + filteredTransactions.length} of{" "}
              {(report?.totalTransactions ?? totalLoaded).toLocaleString()}
            </span>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <label style={{ fontSize: 13, color: "#6B7280" }}>Rows:</label>
              <select
                value={pageSize}
                onChange={(e) => handlePageSizeChange(Number(e.target.value))}
                style={S.pageSizeSelect}
              >
                {PAGE_SIZE_OPTIONS.map((size) => (
                  <option key={size} value={size}>
                    {size}
                  </option>
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

      {selectedTransaction && (
        <TransactionDetails
          transaction={selectedTransaction}
          onClose={() => setSelectedTransaction(null)}
        />
      )}
    </div>
  );
}

function PersonCell({
  name,
  id,
  email,
}: {
  name?: string;
  id?: string;
  email?: string;
}) {
  return (
    <div>
      <div style={S.primaryText}>{name ?? id ?? "N/A"}</div>
      {!isDevelopmentEmail(email) && (
        <div style={S.secondaryText}>{email ?? id ?? ""}</div>
      )}
    </div>
  );
}

function TransactionDetails({
  transaction,
  onClose,
}: {
  transaction: AdminTransaction;
  onClose: () => void;
}) {
  const details = [
    ["Reference", shortTransactionReference(transaction.transactionId)],
    ["Full transaction ID", transaction.transactionId],
    ["Type", formatLabel(transaction.paymentType)],
    ["Status", formatLabel(transaction.status)],
    ["Amount", formatCurrency(transaction.amount)],
    ["Platform fee", formatCurrency(transaction.platformFee)],
    ["Payment method", formatLabel(transaction.paymentMethod)],
    ["External reference", transaction.externalReference ?? "N/A"],
    ["Loan reference", transaction.loanId ?? "N/A"],
    ["Lender", transaction.lenderName ?? transaction.lenderId ?? "N/A"],
    ["Borrower", transaction.borrowerName ?? transaction.borrowerId ?? "N/A"],
    ["Created at", formatFullDate(transaction.createdAt)],
    ["Completed at", formatFullDate(transaction.paidAt)],
    ["Last updated", formatFullDate(transaction.updatedAt)],
  ];

  return (
    <div style={S.modalOverlay} onClick={onClose}>
      <div
        style={S.modal}
        role="dialog"
        aria-modal="true"
        aria-labelledby="transaction-details-title"
        onClick={(event) => event.stopPropagation()}
      >
        <div style={S.modalHeader}>
          <div>
            <h2 id="transaction-details-title" style={S.modalTitle}>
              Transaction Details
            </h2>
            <p style={S.modalSubtitle}>
              {shortTransactionReference(transaction.transactionId)}
            </p>
          </div>
          <button
            className="btn-secondary btn-sm"
            onClick={onClose}
            aria-label="Close transaction details"
          >
            <X size={18} />
          </button>
        </div>
        <div style={S.detailsGrid}>
          {details.map(([label, value]) => (
            <div key={label} style={S.detailItem}>
              <span style={S.detailLabel}>{label}</span>
              <span style={S.detailValue}>{value}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function isDevelopmentEmail(email?: string) {
  return Boolean(email && /(seed|bulk[._-]?dev)/i.test(email));
}

function shortTransactionReference(transactionId: string) {
  let hash = 0;
  for (const character of transactionId) {
    hash = (hash * 31 + character.charCodeAt(0)) >>> 0;
  }
  return `TXN-${String(hash % 1_000_000).padStart(6, "0")}`;
}

function csvCell(value: string) {
  return `"${value.replaceAll('"', '""')}"`;
}

function formatCurrency(value: number) {
  return `LKR ${value.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function formatDate(value?: string) {
  if (!value) {
    return "N/A";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatFullDate(value?: string) {
  if (!value) return "N/A";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString();
}

function formatLabel(value?: string) {
  if (!value) {
    return "N/A";
  }

  return value
    .replace(/[_-]/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function getStatusBadge(status: string) {
  const normalized = status.toLowerCase();

  if (["completed", "success", "successful"].includes(normalized)) {
    return "badge-success";
  }

  if (normalized === "failed") {
    return "badge-danger";
  }

  if (normalized === "pending") {
    return "badge-warning";
  }

  return "badge-info";
}

// Builds the summary cards so the ledger body stays easier to scan.
function buildTransactionSummaryCards(
  report: TransactionsReportResponse["data"] | null,
): TransactionSummaryCard[] {
  return [
    {
      label: "Total Transactions",
      value: (report?.totalTransactions ?? 0).toLocaleString(),
      helper: "All recorded transactions",
      icon: Activity,
      color: "#007AFF",
      bg: "#EFF6FF",
    },
    {
      label: "Completed",
      value: (report?.successfulTransactions ?? 0).toLocaleString(),
      helper: "Verified or settled",
      icon: CheckCircle2,
      color: "#10B981",
      bg: "#ECFDF5",
    },
    {
      label: "Pending",
      value: (report?.pendingTransactions ?? 0).toLocaleString(),
      helper: "Awaiting completion",
      icon: Clock3,
      color: "#F59E0B",
      bg: "#FFFBEB",
    },
    {
      label: "Failed",
      value: (report?.failedTransactions ?? 0).toLocaleString(),
      helper: "Unsuccessful transactions",
      icon: XCircle,
      color: "#EF4444",
      bg: "#FEF2F2",
    },
    {
      label: "Transaction Volume",
      value: formatCurrency(report?.totalTransactionVolume ?? 0),
      helper: "Total processed amount",
      icon: Activity,
      color: "#8B5CF6",
      bg: "#F5F3FF",
    },
  ];
}

const S = {
  errorCard: {
    marginBottom: 16,
    color: "#991B1B",
    background: "#FEF2F2",
    border: "1px solid #FECACA",
  },
  streamPill: {
    display: "inline-flex",
    alignItems: "center",
    gap: 8,
    padding: "8px 12px",
    borderRadius: 999,
    background: "#FFFFFF",
    color: "#374151",
    boxShadow: "var(--shadow-card)",
    fontSize: 13,
    fontWeight: 600,
  },
  streamDot: {
    width: 8,
    height: 8,
    borderRadius: "50%",
  },
  statsGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(5, minmax(0, 1fr))",
    gap: 16,
    marginBottom: 16,
  },
  statCard: {
    display: "flex",
    flexDirection: "column",
  },
  statTop: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  statLabel: {
    fontSize: 13,
    color: "#6B7280",
    fontWeight: 500,
  },
  statValue: {
    marginTop: 4,
    fontSize: 24,
    fontWeight: 700,
    color: "#111827",
  },
  helperText: {
    marginTop: 10,
    fontSize: 12,
    color: "#6B7280",
  },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: 10,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  toolbarCard: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 16,
    marginBottom: 16,
    flexWrap: "wrap",
  },
  filterArea: {
    display: "flex",
    alignItems: "center",
    gap: 10,
    flexWrap: "wrap",
  },
  filterSelect: {
    width: 150,
  },
  dateInput: {
    width: 145,
  },
  toolbarRight: {
    display: "flex",
    alignItems: "center",
    gap: 10,
  },
  searchWrap: {
    width: 320,
  },
  primaryText: {
    fontWeight: 600,
    color: "#111827",
    whiteSpace: "nowrap",
  },
  secondaryText: {
    marginTop: 2,
    fontSize: 12,
    color: "#6B7280",
    whiteSpace: "nowrap",
  },
  amount: {
    fontWeight: 700,
    whiteSpace: "nowrap",
  },
  statusCell: {
    minWidth: 96,
  },
  dateText: {
    whiteSpace: "nowrap",
  },
  clickableRow: {
    cursor: "pointer",
  },
  emptyCell: {
    textAlign: "center",
    padding: 28,
    color: "#6B7280",
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
  modalOverlay: {
    position: "fixed",
    inset: 0,
    zIndex: 1000,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
    background: "rgba(15, 23, 42, 0.55)",
  },
  modal: {
    width: "min(720px, 100%)",
    maxHeight: "85vh",
    overflowY: "auto",
    padding: 24,
    borderRadius: 16,
    background: "#FFFFFF",
    boxShadow: "0 24px 60px rgba(15, 23, 42, 0.25)",
  },
  modalHeader: {
    display: "flex",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 16,
    paddingBottom: 18,
    borderBottom: "1px solid #E5E7EB",
  },
  modalTitle: {
    margin: 0,
    fontSize: 20,
    color: "#111827",
  },
  modalSubtitle: {
    marginTop: 4,
    fontSize: 13,
    color: "#6B7280",
  },
  detailsGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
    gap: 12,
    marginTop: 18,
  },
  detailItem: {
    display: "flex",
    flexDirection: "column",
    gap: 5,
    minWidth: 0,
    padding: 12,
    borderRadius: 10,
    background: "#F9FAFB",
  },
  detailLabel: {
    fontSize: 11,
    fontWeight: 600,
    color: "#6B7280",
    textTransform: "uppercase",
    letterSpacing: "0.04em",
  },
  detailValue: {
    fontSize: 13,
    fontWeight: 600,
    color: "#111827",
    overflowWrap: "anywhere",
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
} satisfies Record<string, StyleValue>;
