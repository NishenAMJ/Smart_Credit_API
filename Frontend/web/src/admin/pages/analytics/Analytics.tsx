import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { CreditCard, DollarSign, Users, Activity } from "lucide-react";
import {
  getLoansReport,
  getRevenueReport,
  getTransactionsReport,
  getUsersReport,
  type LoansReportResponse,
  type RevenueReportResponse,
  type TransactionsReportResponse,
  type UsersReportResponse,
} from "../../lib/api";

// Renders the admin analytics dashboard with reports and trend charts.
export default function Analytics() {
  const navigate = useNavigate();
  const [usersReport, setUsersReport] = useState<
    UsersReportResponse["data"] | null
  >(null);
  const [loansReport, setLoansReport] = useState<
    LoansReportResponse["data"] | null
  >(null);
  const [transactionsReport, setTransactionsReport] = useState<
    TransactionsReportResponse["data"] | null
  >(null);
  const [revenueReport, setRevenueReport] = useState<
    RevenueReportResponse["data"] | null
  >(null);
  const [error, setError] = useState("");

  const loadReports = useCallback(async () => {
    try {
      const [users, loans, transactions, revenue] = await Promise.all([
        getUsersReport(),
        getLoansReport(),
        getTransactionsReport(),
        getRevenueReport(),
      ]);

      setUsersReport(users.data);
      setLoansReport(loans.data);
      setTransactionsReport(transactions.data);
      setRevenueReport(revenue.data);
      setError("");
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to load analytics.",
      );
    }
  }, []);

  useEffect(() => {
    void loadReports();
  }, [loadReports]);

  useEffect(() => {
    const interval = window.setInterval(() => {
      void loadReports();
    }, 10000);

    return () => window.clearInterval(interval);
  }, [loadReports]);

  const summaryCards = [
    {
      label: "Total Loans",
      value: loansReport?.totalLoans ?? 0,
      helper: `${loansReport?.pendingApprovals ?? 0} pending approvals`,
      icon: CreditCard,
      color: "#007AFF",
      bg: "#EFF6FF",
    },
    {
      label: "Revenue",
      value: `LKR ${(revenueReport?.totalRevenue ?? 0).toLocaleString()}`,
      helper: `LKR ${(revenueReport?.monthlyRevenue ?? 0).toLocaleString()} this month`,
      icon: DollarSign,
      color: "#10B981",
      bg: "#ECFDF5",
    },
    {
      label: "Active Users",
      value: usersReport?.activeUsers ?? 0,
      helper: `${usersReport?.newUsersThisMonth ?? 0} new this month`,
      icon: Users,
      color: "#8B5CF6",
      bg: "#F5F3FF",
    },
    {
      label: "Transactions",
      value: transactionsReport?.totalTransactions ?? 0,
      helper: `${transactionsReport?.failedTransactions ?? 0} failed`,
      icon: Activity,
      color: "#F59E0B",
      bg: "#FFFBEB",
      to: "/transactions",
    },
  ];

  const revenueTrend = revenueReport?.revenueByMonth ?? [];

  const userBreakdown = useMemo(() => {
    if (!usersReport) {
      return [];
    }

    return [
      { label: "Borrowers", value: usersReport.borrowers },
      { label: "Lenders", value: usersReport.lenders },
      { label: "Admins", value: usersReport.usersByRole.admin },
    ];
  }, [usersReport]);

  const loanBreakdown = useMemo(() => {
    if (!loansReport) {
      return [];
    }

    return Object.entries(loansReport.loansByStatus).map(([status, value]) => ({
      status,
      value,
    }));
  }, [loansReport]);

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Analytics</h1>
          <p className="page-subtitle">
            Reports powered by the live NestJS admin endpoints
          </p>
        </div>
      </div>

      {error && (
        <div className="card" style={S.errorCard}>
          {error}
        </div>
      )}

      <div style={S.statsGrid}>
        {summaryCards.map((card) => {
          const Icon = card.icon;
          return (
            <div
              key={card.label}
              className="card"
              style={{
                ...S.statCard,
                cursor: card.to ? "pointer" : "default",
              }}
              onClick={() => {
                if (card.to) navigate(card.to);
              }}
            >
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

      <div style={S.grid}>
        <div className="card">
          <div style={S.chartHeader}>
            <p style={S.chartTitle}>Revenue Trend</p>
            <p style={S.chartSub}>Monthly revenue from the backend report</p>
          </div>
          <ResponsiveContainer width="100%" height={260}>
            <AreaChart data={revenueTrend}>
              <defs>
                <linearGradient id="revenueFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10B981" stopOpacity={0.25} />
                  <stop offset="95%" stopColor="#10B981" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="#F3F4F6"
                vertical={false}
              />
              <XAxis
                dataKey="month"
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 12, fill: "#6B7280" }}
              />
              <YAxis
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 12, fill: "#6B7280" }}
              />
              <Tooltip />
              <Area
                type="monotone"
                dataKey="revenue"
                stroke="#10B981"
                fill="url(#revenueFill)"
                strokeWidth={2.5}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div className="card">
          <div style={S.chartHeader}>
            <p style={S.chartTitle}>User Breakdown</p>
            <p style={S.chartSub}>Current user roles</p>
          </div>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={userBreakdown}>
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="#F3F4F6"
                vertical={false}
              />
              <XAxis
                dataKey="label"
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 12, fill: "#6B7280" }}
              />
              <YAxis
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 12, fill: "#6B7280" }}
              />
              <Tooltip />
              <Bar dataKey="value" fill="#007AFF" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div style={{ marginTop: 16 }}>
        <div className="card">
          <div style={S.chartHeader}>
            <p style={S.chartTitle}>Loan Status Breakdown</p>
            <p style={S.chartSub}>Aggregated loan report from the backend</p>
          </div>
          <div
            className="table-container"
            style={{ boxShadow: "none", border: "none", padding: 0 }}
          >
            <table>
              <thead>
                <tr>
                  <th>Status</th>
                  <th>Count</th>
                </tr>
              </thead>
              <tbody>
                {loanBreakdown.map((item) => (
                  <tr key={item.status}>
                    <td>{item.status}</td>
                    <td>{item.value}</td>
                  </tr>
                ))}
                {!loanBreakdown.length && (
                  <tr>
                    <td
                      colSpan={2}
                      style={{
                        textAlign: "center",
                        padding: 24,
                        color: "#6B7280",
                      }}
                    >
                      No analytics data available.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

const S: Record<string, React.CSSProperties> = {
  errorCard: {
    marginBottom: 16,
    color: "#991B1B",
    background: "#FEF2F2",
    border: "1px solid #FECACA",
  },
  statsGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(4, 1fr)",
    gap: 16,
    marginBottom: 24,
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
    fontSize: 28,
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
  grid: {
    display: "grid",
    gridTemplateColumns: "1.5fr 1fr",
    gap: 16,
  },
  chartHeader: {
    marginBottom: 16,
  },
  chartTitle: {
    fontSize: 15,
    fontWeight: 700,
    color: "#111827",
  },
  chartSub: {
    marginTop: 4,
    fontSize: 12,
    color: "#6B7280",
  },
};
