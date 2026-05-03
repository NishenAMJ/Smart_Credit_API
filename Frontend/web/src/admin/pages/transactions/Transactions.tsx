import { useCallback, useEffect, useMemo, useState, type CSSProperties } from "react";
import { Activity, CheckCircle2, Clock3, RefreshCw, Search, XCircle, ChevronLeft, ChevronRight } from "lucide-react";
import {
  getTransactions,
  subscribeToTransactions,
  type AdminTransaction,
} from "../../lib/api";

type StatusFilter = "all" | "completed" | "pending" | "failed";

const STATUS_FILTERS: Array<{ label: string; value: StatusFilter }> = [
  { label: "All", value: "all" },
  { label: "Completed", value: "completed" },
  { label: "Pending", value: "pending" },
  { label: "Failed", value: "failed" },
];

const PAGE_SIZE_OPTIONS = [10, 20, 50, 100] as const;

export default function Transactions() {
  const [transactions, setTransactions] = useState<AdminTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");

  // Pagination state
  const [pageSize, setPageSize] = useState<number>(10);
  const [currentPage, setCurrentPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [nextCursor, setNextCursor] = useState<string | undefined>();
  const [cursorStack, setCursorStack] = useState<string[]>([]);
  const [totalLoaded, setTotalLoaded] = useState(0);

  const loadTransactions = useCallback(async (cursor?: string) => {
    setLoading(true);
    try {
      const response = await getTransactions(pageSize, cursor);
      setTransactions(response.transactions);
      setHasMore(response.hasMore ?? false);
      setNextCursor(response.nextCursor);
      setTotalLoaded(response.count);
      setError(response.error ?? "");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load transactions.");
    } finally {
      setLoading(false);
    }
  }, [pageSize]);

  useEffect(() => {
    setCurrentPage(1);
    setCursorStack([]);
    void loadTransactions();
  }, [loadTransactions]);

  useEffect(() => {
    if (currentPage !== 1) {
      return;
    }

    const source = subscribeToTransactions(
      (data) => {
        if (data.success && data.transactions) {
          setTransactions(data.transactions);
          setHasMore(("hasMore" in data && typeof data.hasMore === "boolean") ? data.hasMore : false);
          setNextCursor(("nextCursor" in data && typeof data.nextCursor === "string") ? data.nextCursor : undefined);
          setTotalLoaded(data.count);
          setError(data.error ?? "");
        }
      },
      () => {
        // Keep the lumith UI unchanged; fall back to normal manual refresh on stream errors.
      },
      pageSize,
    );

    return () => source.close();
  }, [currentPage, pageSize]);

  const filteredTransactions = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();

    return transactions.filter((transaction) => {
      const matchesStatus =
        statusFilter === "all" ||
        transaction.status.toLowerCase() === statusFilter;
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
          transaction.status,
        ]
          .filter(Boolean)
          .some((value) => value!.toLowerCase().includes(normalizedSearch));

      return matchesStatus && matchesSearch;
    });
  }, [search, statusFilter, transactions]);

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
    const prevCursor = newStack.length > 0 ? newStack[newStack.length - 1] : undefined;
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

  const stats = useMemo(() => {
    const completed = transactions.filter((transaction) =>
      ["completed", "success", "successful"].includes(transaction.status.toLowerCase()),
    ).length;
    const pending = transactions.filter(
      (transaction) => transaction.status.toLowerCase() === "pending",
    ).length;
    const failed = transactions.filter(
      (transaction) => transaction.status.toLowerCase() === "failed",
    ).length;
    const volume = transactions.reduce(
      (total, transaction) => total + transaction.amount,
      0,
    );

    return [
      {
        label: "Total Transactions",
        value: transactions.length.toLocaleString(),
        helper: `${filteredTransactions.length} visible`,
        icon: Activity,
        color: "#007AFF",
        bg: "#EFF6FF",
      },
      {
        label: "Completed",
        value: completed.toLocaleString(),
        helper: "Verified or settled",
        icon: CheckCircle2,
        color: "#10B981",
        bg: "#ECFDF5",
      },
      {
        label: "Pending",
        value: pending.toLocaleString(),
        helper: "Awaiting completion",
        icon: Clock3,
        color: "#F59E0B",
        bg: "#FFFBEB",
      },
      {
        label: "Volume",
        value: formatCurrency(volume),
        helper: `${failed} failed`,
        icon: XCircle,
        color: "#EF4444",
        bg: "#FEF2F2",
      },
    ];
  }, [filteredTransactions.length, transactions]);

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Transactions</h1>
          <p className="page-subtitle">Payments, repayments, lenders, and borrowers</p>
        </div>
      </div>

      {error && <div className="card" style={S.errorCard}>{error}</div>}

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
            onClick={() => {
              setCurrentPage(1);
              setCursorStack([]);
              void loadTransactions();
            }}
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
              <th>Paid</th>
            </tr>
          </thead>
          <tbody>
            {filteredTransactions.map((transaction) => (
              <tr key={transaction.id}>
                <td>
                  <div style={S.primaryText}>{transaction.transactionId}</div>
                  <div style={S.secondaryText}>{formatDate(transaction.createdAt)}</div>
                  <div style={S.secondaryText}>Loan: {transaction.loanId ?? "N/A"}</div>
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
                  <div style={S.amount}>{formatCurrency(transaction.amount)}</div>
                  <div style={S.secondaryText}>{formatLabel(transaction.paymentType)}</div>
                </td>
                <td>
                  <div style={S.statusCell}>
                    <span className={`badge ${getStatusBadge(transaction.status)}`}>
                      {formatLabel(transaction.status)}
                    </span>
                  </div>
                </td>
                <td>{formatDate(transaction.paidAt ?? transaction.createdAt)}</td>
              </tr>
            ))}

            {!filteredTransactions.length && (
              <tr>
                <td colSpan={6} style={S.emptyCell}>
                  {loading ? "Loading transactions..." : "No transactions found."}
                </td>
              </tr>
            )}
          </tbody>
        </table>

        {/* Pagination Controls */}
        <div style={S.paginationBar}>
          <div style={S.paginationInfo}>
            <span style={{ fontSize: 13, color: "#6B7280" }}>
              Showing {filteredTransactions.length > 0 ? (currentPage - 1) * pageSize + 1 : 0}
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
      <div style={S.secondaryText}>{email ?? id ?? ""}</div>
    </div>
  );
}

function formatCurrency(value: number) {
  return `LKR ${value.toLocaleString(undefined, {
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

const S: Record<string, any> = {
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
    gridTemplateColumns: "repeat(4, 1fr)",
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
    whiteSpace: "normal",
    wordBreak: "break-word",
  },
  secondaryText: {
    marginTop: 2,
    fontSize: 12,
    color: "#6B7280",
    whiteSpace: "normal",
    wordBreak: "break-word",
  },
  amount: {
    fontWeight: 700,
    whiteSpace: "nowrap",
  },
  statusCell: {
    minWidth: 96,
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
