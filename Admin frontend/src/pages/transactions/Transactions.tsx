import { useEffect, useMemo, useState, type CSSProperties } from "react";
import { Activity, CheckCircle2, Clock3, RefreshCw, Search, XCircle } from "lucide-react";
import {
  getTransactions,
  subscribeToTransactions,
  type AdminTransaction,
} from "../../lib/api";

type StreamStatus = "connecting" | "live" | "offline";
type StatusFilter = "all" | "completed" | "pending" | "failed";

const STATUS_FILTERS: Array<{ label: string; value: StatusFilter }> = [
  { label: "All", value: "all" },
  { label: "Completed", value: "completed" },
  { label: "Pending", value: "pending" },
  { label: "Failed", value: "failed" },
];

export default function Transactions() {
  const [transactions, setTransactions] = useState<AdminTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [streamStatus, setStreamStatus] = useState<StreamStatus>("connecting");

  useEffect(() => {
    let mounted = true;

    async function loadInitialTransactions() {
      try {
        const response = await getTransactions();
        if (!mounted) return;

        setTransactions(response.transactions);
        setError(response.error ?? "");
      } catch (err) {
        if (!mounted) return;
        setError(err instanceof Error ? err.message : "Failed to load transactions.");
      } finally {
        if (mounted) setLoading(false);
      }
    }

    void loadInitialTransactions();

    try {
      const source = subscribeToTransactions(
        (payload) => {
          if (!mounted) return;
          setTransactions(payload.transactions);
          setError(payload.error ?? "");
          setStreamStatus(payload.success ? "live" : "offline");
          setLoading(false);
        },
        () => {
          if (!mounted) return;
          setStreamStatus("offline");
        },
      );

      return () => {
        mounted = false;
        source.close();
      };
    } catch (err) {
      setStreamStatus("offline");
      setError(err instanceof Error ? err.message : "Failed to open transaction stream.");
    }

    return () => {
      mounted = false;
    };
  }, []);

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
        <div style={S.streamPill}>
          <span
            style={{
              ...S.streamDot,
              background:
                streamStatus === "live"
                  ? "#10B981"
                  : streamStatus === "connecting"
                    ? "#F59E0B"
                    : "#EF4444",
            }}
          />
          {streamStatus === "live"
            ? "Live"
            : streamStatus === "connecting"
              ? "Connecting"
              : "Offline"}
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
            onClick={() => window.location.reload()}
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
              <th>Loan</th>
              <th>Amount</th>
              <th>Type</th>
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
                <td>{transaction.loanId ?? "N/A"}</td>
                <td style={S.amount}>{formatCurrency(transaction.amount)}</td>
                <td>{formatLabel(transaction.paymentType)}</td>
                <td>
                  <span className={`badge ${getStatusBadge(transaction.status)}`}>
                    {formatLabel(transaction.status)}
                  </span>
                </td>
                <td>{formatDate(transaction.paidAt ?? transaction.createdAt)}</td>
              </tr>
            ))}

            {!filteredTransactions.length && (
              <tr>
                <td colSpan={8} style={S.emptyCell}>
                  {loading ? "Loading transactions..." : "No transactions found."}
                </td>
              </tr>
            )}
          </tbody>
        </table>
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

const S: Record<string, CSSProperties> = {
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
  emptyCell: {
    textAlign: "center",
    padding: 28,
    color: "#6B7280",
  },
};
