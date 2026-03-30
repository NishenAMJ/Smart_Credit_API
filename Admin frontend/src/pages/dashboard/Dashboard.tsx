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

// ── Mock Data ─────────────────────────────────────────────────────────────────
const statCards = [
  {
    label:  "Total Lenders",
    value:  "132",
    change: "+12% this month",
    up:     true,
    icon:   Users,
    color:  "#007AFF",
    bg:     "#EFF6FF",
  },
  {
    label:  "Total Borrowers",
    value:  "132",
    change: "+8% this month",
    up:     true,
    icon:   CreditCard,
    color:  "#10B981",
    bg:     "#ECFDF5",
  },
  {
    label:  "Pending KYC",
    value:  "132",
    change: "-5% this month",
    up:     false,
    icon:   Activity,
    color:  "#F59E0B",
    bg:     "#FFFBEB",
  },
  {
    label:  "Number",
    value:  "132",
    change: "+3% this month",
    up:     true,
    icon:   TrendingUp,
    color:  "#8B5CF6",
    bg:     "#F5F3FF",
  },
];

const barData = [
  { month: "Jan", lenders: 40, borrowers: 24 },
  { month: "Feb", lenders: 55, borrowers: 38 },
  { month: "Mar", lenders: 47, borrowers: 52 },
  { month: "Apr", lenders: 60, borrowers: 41 },
  { month: "May", lenders: 75, borrowers: 63 },
  { month: "Jun", lenders: 68, borrowers: 55 },
  { month: "Jul", lenders: 82, borrowers: 70 },
];

const pieData = [
  { name: "Approved", value: 63, color: "#007AFF" },
  { name: "Pending",  value: 25, color: "#F59E0B" },
  { name: "Rejected", value: 12, color: "#EF4444" },
];

const recentAdmins = [
  { name: "Sarah Johnson",  email: "sarah@smartcredit.com",  role: "Moderator",  status: "active"   },
  { name: "David Chen",     email: "david@smartcredit.com",  role: "Analyst",    status: "active"   },
  { name: "Priya Patel",    email: "priya@smartcredit.com",  role: "Support",    status: "inactive" },
  { name: "Marcus Williams",email: "marcus@smartcredit.com", role: "Moderator",  status: "active"   },
];

// ── Badge helper ──────────────────────────────────────────────────────────────
function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    active:   "badge badge-success",
    inactive: "badge badge-gray",
  };
  return <span className={map[status] ?? "badge badge-gray"}>{status}</span>;
}

// ── Avatar initials ───────────────────────────────────────────────────────────
function Avatar({ name }: { name: string }) {
  const initials = name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
  return (
    <div style={S.avatar}>
      {initials}
    </div>
  );
}

// ── Component ─────────────────────────────────────────────────────────────────
export default function Dashboard() {
  return (
    <div>

      {/* Page header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Admin Dashboard</h1>
          <p className="page-subtitle">Welcome back! Here's what's happening today.</p>
        </div>
        <div style={{ fontSize: 13, color: "#6B7280" }}>
          {new Date().toLocaleDateString("en-US", {
            weekday: "long",
            year:    "numeric",
            month:   "long",
            day:     "numeric",
          })}
        </div>
      </div>

      {/* ── Stat cards ── */}
      <div style={S.statsGrid}>
        {statCards.map((card) => {
          const Icon = card.icon;
          return (
            <div key={card.label} className="card" style={S.statCard}>
              <div style={S.statTop}>
                <div>
                  <p style={S.statLabel}>{card.label}</p>
                  <p style={S.statValue}>{card.value}</p>
                </div>
                <div style={{ ...S.iconBox, background: card.bg }}>
                  <Icon size={20} color={card.color} />
                </div>
              </div>
              <p style={{
                fontSize: 12,
                fontWeight: 500,
                color: card.up ? "#10B981" : "#EF4444",
                marginTop: 10,
              }}>
                {card.up ? "▲" : "▼"} {card.change}
              </p>
            </div>
          );
        })}
      </div>

      {/* ── Charts row ── */}
      <div style={S.chartsRow}>

        {/* Bar chart */}
        <div className="card" style={{ flex: 2 }}>
          <div style={S.cardHeader}>
            <p style={S.cardTitle}>Overview</p>
            <div style={S.legendRow}>
              <span style={S.legendDot("#007AFF")} /> Lenders
              <span style={{ width: 16 }} />
              <span style={S.legendDot("#10B981")} /> Borrowers
            </div>
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={barData} barSize={10} barGap={4}>
              <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" vertical={false} />
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
              <Tooltip
                contentStyle={{
                  borderRadius: 8,
                  border: "none",
                  boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
                  fontSize: 13,
                }}
              />
              <Bar dataKey="lenders"   fill="#007AFF" radius={[4, 4, 0, 0]} />
              <Bar dataKey="borrowers" fill="#10B981" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Pie chart */}
        <div className="card" style={{ flex: 1 }}>
          <div style={S.cardHeader}>
            <p style={S.cardTitle}>Activity</p>
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
                {pieData.map((entry, i) => (
                  <Cell key={i} fill={entry.color} />
                ))}
              </Pie>
            </PieChart>
            <div style={{ display: "flex", flexDirection: "column", gap: 8, width: "100%" }}>
              {pieData.map((d) => (
                <div key={d.name} style={S.legendItem}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <div style={{ width: 10, height: 10, borderRadius: "50%", background: d.color, flexShrink: 0 }} />
                    <span style={{ fontSize: 13, color: "#6B7280" }}>{d.name}</span>
                  </div>
                  <span style={{ fontSize: 13, fontWeight: 600, color: "#1A1A1A" }}>{d.value}%</span>
                </div>
              ))}
            </div>
          </div>
        </div>

      </div>

      {/* ── Recent admins table ── */}
      <div style={{ marginTop: 24 }}>
        <div style={{ ...S.cardHeader, marginBottom: 16 }}>
          <p style={S.cardTitle}>Recent Admin Activity</p>
          <button
            className="btn-secondary btn-sm"
            onClick={() => {}}
          >
            View All
          </button>
        </div>

        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>Admin</th>
                <th>Email</th>
                <th>Role</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {recentAdmins.map((admin) => (
                <tr key={admin.email}>
                  <td>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <Avatar name={admin.name} />
                      <span style={{ fontWeight: 500, fontSize: 14 }}>{admin.name}</span>
                    </div>
                  </td>
                  <td style={{ color: "#6B7280" }}>{admin.email}</td>
                  <td style={{ color: "#6B7280" }}>{admin.role}</td>
                  <td><StatusBadge status={admin.status} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────
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
};

function S_legendDot(color: string): React.CSSProperties {
  return {
    display: "inline-block",
    width: 8,
    height: 8,
    borderRadius: "50%",
    background: color,
    marginRight: 5,
  };
}

// attach to S so JSX can use it inline
Object.assign(S, { legendDot: S_legendDot });