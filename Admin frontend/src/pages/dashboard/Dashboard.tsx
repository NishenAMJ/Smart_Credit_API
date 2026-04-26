import { useEffect, useState } from "react";
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

function StatusBadge({ active }: { active: boolean }) {
  return (
    <span className={active ? "badge badge-success" : "badge badge-gray"}>
      {active ? "active" : "clear"}
    </span>
  );
}

function Avatar({ label }: { label: string }) {
  const initials = label
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return <div style={S.avatar}>{initials}</div>;
}

export default function Dashboard() {
  const [dashboard, setDashboard] = useState<DashboardAnalyticsResponse["data"] | null>(null);
  const [usersReport, setUsersReport] = useState<UsersReportResponse["data"] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadDashboard() {
      try {
        const [dashboardResponse, usersResponse] = await Promise.all([
          getDashboardAnalytics(),
          getUsersReport(),
        ]);
        setDashboard(dashboardResponse.data);
        setUsersReport(usersResponse.data);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load dashboard.");
      } finally {
        setLoading(false);
      }
    }

    void loadDashboard();
  }, []);

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

  const alerts = dashboard?.alerts ?? [];

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Admin Dashboard</h1>
          <p className="page-subtitle">Live metrics from Firestore users, loans, requests, transactions, and disputes</p>
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

      {error && <div className="card" style={S.errorCard}>{error}</div>}

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
              <p style={{ fontSize: 12, fontWeight: 500, color: card.up ? "#10B981" : "#EF4444", marginTop: 10 }}>
                {card.up ? "▲" : "▼"} {card.change}
              </p>
            </div>
          );
        })}
      </div>

      <div style={S.chartsRow}>
        <div className="card" style={{ flex: 2 }}>
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
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={roleBreakdown} barSize={28} barGap={10}>
              <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" vertical={false} />
              <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: "#6B7280" }} />
              <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: "#6B7280" }} />
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
                          : "#8B5CF6"
                    }
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="card" style={{ flex: 1 }}>
          <div style={S.cardHeader}>
            <p style={S.cardTitle}>Today&apos;s Activity</p>
          </div>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 20 }}>
            <PieChart width={160} height={160}>
              <Pie
                data={pieData}
                cx={75}
                cy={75}
                innerRadius={48}
                outerRadius={72}
                paddingAngle={3}
                dataKey="value"
              >
                {pieData.map((entry) => (
                  <Cell key={entry.name} fill={entry.color} />
                ))}
              </Pie>
            </PieChart>

            <div style={{ display: "flex", flexDirection: "column", gap: 8, width: "100%" }}>
              {pieData.map((item) => (
                <div key={item.name} style={S.legendItem}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <div style={{ width: 10, height: 10, borderRadius: "50%", background: item.color, flexShrink: 0 }} />
                    <span style={{ fontSize: 13, color: "#6B7280" }}>{item.name}</span>
                  </div>
                  <span style={{ fontSize: 13, fontWeight: 600, color: "#1A1A1A" }}>{item.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div style={{ marginTop: 24 }}>
        <div style={{ ...S.cardHeader, marginBottom: 16 }}>
          <p style={S.cardTitle}>System Alerts</p>
          <button className="btn-secondary btn-sm">View All</button>
        </div>

        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>Alert</th>
                <th>Type</th>
                <th>Count</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {(alerts.length ? alerts : [{ message: "No critical system alerts", type: "info", count: 0 }]).map((alert) => (
                <tr key={`${alert.message}-${alert.type}`}>
                  <td>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <Avatar label={alert.message} />
                      <span style={{ fontWeight: 500, fontSize: 14 }}>{alert.message}</span>
                    </div>
                  </td>
                  <td style={{ color: "#6B7280", textTransform: "capitalize" }}>{alert.type}</td>
                  <td style={{ color: "#6B7280" }}>{alert.count}</td>
                  <td><StatusBadge active={alert.count > 0} /></td>
                </tr>
              ))}
            </tbody>
          </table>
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
    alignItems: "flex-start",
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
    padding: "6px 0",
    borderBottom: "1px solid #F3F4F6",
  },
  avatar: {
    width: 34,
    height: 34,
    borderRadius: "50%",
    background: "#EFF6FF",
    color: "#007AFF",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: 12,
    fontWeight: 600,
    flexShrink: 0,
  },
  errorCard: {
    marginBottom: 16,
    color: "#991B1B",
    background: "#FEF2F2",
    border: "1px solid #FECACA",
  },
};

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
