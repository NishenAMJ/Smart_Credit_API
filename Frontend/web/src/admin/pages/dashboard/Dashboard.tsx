import { useCallback, useEffect, useState } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import { Users, CreditCard, TrendingUp, Activity } from "lucide-react";
import {
  getDashboardAnalytics,
  getUsersReport,
  type DashboardAnalyticsResponse,
  type UsersReportResponse,
} from "../../lib/api";

// Renders the admin dashboard overview, charts, and summary cards.
export default function Dashboard() {
  const [dashboard, setDashboard] = useState<
    DashboardAnalyticsResponse["data"] | null
  >(null);
  const [usersReport, setUsersReport] = useState<
    UsersReportResponse["data"] | null
  >(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadDashboard = useCallback(async () => {
    try {
      const [dashboardResponse, usersResponse] = await Promise.all([
        getDashboardAnalytics(),
        getUsersReport(),
      ]);
      setDashboard(dashboardResponse.data);
      setUsersReport(usersResponse.data);
      setError("");
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to load dashboard.",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadDashboard();
  }, [loadDashboard]);

  useEffect(() => {
    const interval = window.setInterval(() => {
      void loadDashboard();
    }, 10000);

    return () => window.clearInterval(interval);
  }, [loadDashboard]);

  const statCards = [
    {
      label: "Total Users",
      value: dashboard?.overview.totalUsers ?? 0,
      change: `${dashboard?.recentActivity.newUsersToday ?? 0} new today`,
      up: true,
      icon: Users,
      color: "#007AFF",
      bg: "#EFF6FF",
    },
    {
      label: "Total Loans",
      value: dashboard?.overview.totalLoans ?? 0,
      change: `${dashboard?.recentActivity.loansCreatedToday ?? 0} created today`,
      up: true,
      icon: CreditCard,
      color: "#10B981",
      bg: "#ECFDF5",
    },
    {
      label: "Active Disputes",
      value: dashboard?.overview.activeDisputes ?? 0,
      change: `${dashboard?.recentActivity.disputesResolvedToday ?? 0} resolved today`,
      up: (dashboard?.overview.activeDisputes ?? 0) === 0,
      icon: Activity,
      color: "#F59E0B",
      bg: "#FFFBEB",
    },
    {
      label: "Total Revenue",
      value: `LKR ${(dashboard?.overview.totalRevenue ?? 0).toLocaleString()}`,
      change: `${dashboard?.recentActivity.transactionsToday ?? 0} transactions today`,
      up: true,
      icon: TrendingUp,
      color: "#8B5CF6",
      bg: "#F5F3FF",
    },
    
  ];

  const pieData = [
    {
      name: "Users Today",
      value: dashboard?.recentActivity.newUsersToday ?? 0,
      color: "#007AFF",
    },
    {
      name: "Loans Today",
      value: dashboard?.recentActivity.loansCreatedToday ?? 0,
      color: "#10B981",
    },
    {
      name: "Transactions",
      value: dashboard?.recentActivity.transactionsToday ?? 0,
      color: "#F59E0B",
    },
  ];

  const roleBreakdown = [
    { label: "Lenders", value: usersReport?.lenders ?? 0 },
    { label: "Borrowers", value: usersReport?.borrowers ?? 0 },
    { label: "Admins", value: usersReport?.usersByRole.admin ?? 0 },
  ];

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Admin Dashboard</h1>
          <p className="page-subtitle">
            Live metrics from Firestore users, loans, requests, transactions,
            and disputes
          </p>
        </div>
        <div style={{ fontSize: 13, color: "#6B7280" }}>
          {new Date().toLocaleDateString("en-US", {
            weekday: "long",
            year: "numeric",
            month: "long",
            day: "numeric",
          })}
        </div>
      </div>

      {error && (
        <div className="card" style={S.errorCard}>
          {error}
        </div>
      )}

      <div style={S.statsGrid}>
        {statCards.map((card) => {
          const Icon = card.icon;

          return (
            <div key={card.label} className="card" style={S.statCard}>
              <div style={S.statTop}>
                <div>
                  <p style={S.statLabel}>{card.label}</p>
                  <p style={S.statValue}>{loading ? "..." : card.value}</p>
                </div>
                <div style={{ ...S.iconBox, background: card.bg }}>
                  <Icon size={20} color={card.color} />
                </div>
              </div>
              <p
                style={{
                  fontSize: 12,
                  fontWeight: 500,
                  color: card.up ? "#10B981" : "#EF4444",
                  marginTop: 10,
                }}
              >
                {card.up ? "▲" : "▼"} {card.change}
              </p>
            </div>
          );
        })}
      </div>

      <div style={S.chartsRow}>
        <div
          className="card"
          style={{ flex: 2, display: "flex", flexDirection: "column" }}
        >
          <div style={S.cardHeader}>
            <p style={S.cardTitle}>User Role Overview</p>
            <div style={S.legendRow}>
              <span style={legendDot("#007AFF")} /> Lenders
              <span style={{ width: 16 }} />
              <span style={legendDot("#10B981")} /> Borrowers
              <span style={{ width: 16 }} />
              <span style={legendDot("#8B5CF6")} /> Admins
              
            </div>
          </div>
          <div style={{ flex: 1, minHeight: 0 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={roleBreakdown} barSize={50} barGap={10}>
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
                <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                  {roleBreakdown.map((entry) => (
                    <Cell
                      key={entry.label}
                      fill={
                        entry.label === "Lenders"
                          ? "#007AFF"
                          : entry.label === "Borrowers"
                            ? "#10B981"
                            : entry.label === "Admins"
                              ? "#8B5CF6"
                              : "#9CA3AF"
                      }
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div
          className="card"
          style={{ flex: 1, display: "flex", flexDirection: "column" }}
        >
          <div style={S.cardHeader}>
            <p style={S.cardTitle}>Today&apos;s Activity</p>
          </div>
          <div
            style={{
              flex: 1,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              gap: 30,
            }}
          >
            <PieChart width={180} height={180}>
              <Pie
                data={pieData}
                cx={85}
                cy={85}
                innerRadius={55}
                outerRadius={80}
                paddingAngle={3}
                dataKey="value"
              >
                {pieData.map((entry) => (
                  <Cell key={entry.name} fill={entry.color} />
                ))}
              </Pie>
            </PieChart>

            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: 12,
                width: "100%",
                maxWidth: 220,
              }}
            >
              {pieData.map((item) => (
                <div key={item.name} style={S.legendItem}>
                  <div
                    style={{ display: "flex", alignItems: "center", gap: 8 }}
                  >
                    <div
                      style={{
                        width: 10,
                        height: 10,
                        borderRadius: "50%",
                        background: item.color,
                        flexShrink: 0,
                      }}
                    />
                    <span style={{ fontSize: 13, color: "#6B7280" }}>
                      {item.name}
                    </span>
                  </div>
                  <span
                    style={{ fontSize: 13, fontWeight: 600, color: "#1A1A1A" }}
                  >
                    {item.value}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

const S: Record<string, React.CSSProperties> = {
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
    marginBottom: 4,
  },
  statValue: {
    fontSize: 32,
    fontWeight: 700,
    color: "#1A1A1A",
  },
  iconBox: {
    width: 44,
    height: 44,
    borderRadius: 10,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  chartsRow: {
    display: "flex",
    gap: 16,
    alignItems: "stretch",
    height: "calc(100vh - 340px)",
    minHeight: 320,
  },
  cardHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: 600,
    color: "#1A1A1A",
  },
  legendRow: {
    display: "flex",
    alignItems: "center",
    fontSize: 12,
    color: "#6B7280",
  },
  legendItem: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "4px 0",
    borderBottom: "1px solid #F3F4F6",
  },
  errorCard: {
    marginBottom: 16,
    color: "#991B1B",
    background: "#FEF2F2",
    border: "1px solid #FECACA",
  },
};

// Returns the small legend dot used by the chart key.
function legendDot(color: string): React.CSSProperties {
  return {
    display: "inline-block",
    width: 8,
    height: 8,
    borderRadius: "50%",
    background: color,
    marginRight: 5,
  };
}
