import {
  AreaChart, Area,
  BarChart, Bar,
  LineChart, Line,
  PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Legend,
} from "recharts";
import { TrendingUp, TrendingDown, Users, CreditCard, Activity, DollarSign } from "lucide-react";

// ── Mock Data ─────────────────────────────────────────────────────────────────

const monthlyOverview = [
  { month: "Jan", loans: 42,  repayments: 38, defaults: 4,  revenue: 128000 },
  { month: "Feb", loans: 58,  repayments: 51, defaults: 7,  revenue: 174000 },
  { month: "Mar", loans: 65,  repayments: 60, defaults: 5,  revenue: 195000 },
  { month: "Apr", loans: 47,  repayments: 44, defaults: 3,  revenue: 141000 },
  { month: "May", loans: 72,  repayments: 66, defaults: 6,  revenue: 216000 },
  { month: "Jun", loans: 88,  repayments: 80, defaults: 8,  revenue: 264000 },
  { month: "Jul", loans: 95,  repayments: 89, defaults: 6,  revenue: 285000 },
  { month: "Aug", loans: 110, repayments: 102,defaults: 8,  revenue: 330000 },
];

const userGrowth = [
  { month: "Jan", borrowers: 120, lenders: 45 },
  { month: "Feb", borrowers: 145, lenders: 58 },
  { month: "Mar", borrowers: 162, lenders: 67 },
  { month: "Apr", borrowers: 178, lenders: 72 },
  { month: "May", borrowers: 210, lenders: 89 },
  { month: "Jun", borrowers: 248, lenders: 104 },
  { month: "Jul", borrowers: 285, lenders: 118 },
  { month: "Aug", borrowers: 320, lenders: 132 },
];

const loanCategories = [
  { name: "Personal",    value: 38, color: "#007AFF" },
  { name: "Business",    value: 24, color: "#10B981" },
  { name: "Education",   value: 18, color: "#8B5CF6" },
  { name: "Vehicle",     value: 12, color: "#F59E0B" },
  { name: "Agriculture", value: 8,  color: "#EF4444" },
];

const kycTrend = [
  { month: "Jan", approved: 32, rejected: 8,  pending: 12 },
  { month: "Feb", approved: 45, rejected: 10, pending: 8  },
  { month: "Mar", approved: 52, rejected: 7,  pending: 15 },
  { month: "Apr", approved: 38, rejected: 5,  pending: 10 },
  { month: "May", approved: 60, rejected: 12, pending: 6  },
  { month: "Jun", approved: 72, rejected: 9,  pending: 9  },
  { month: "Jul", approved: 85, rejected: 11, pending: 7  },
  { month: "Aug", approved: 98, rejected: 8,  pending: 11 },
];

const repaymentRate = [
  { month: "Jan", rate: 90 },
  { month: "Feb", rate: 88 },
  { month: "Mar", rate: 92 },
  { month: "Apr", rate: 94 },
  { month: "May", rate: 91 },
  { month: "Jun", rate: 93 },
  { month: "Jul", rate: 95 },
  { month: "Aug", rate: 93 },
];

// ── Stat Cards Data ───────────────────────────────────────────────────────────
const statCards = [
  {
    label:  "Total Loans Issued",
    value:  "8,039",
    change: "+16.2%",
    up:     true,
    icon:   CreditCard,
    color:  "#007AFF",
    bg:     "#EFF6FF",
  },
  {
    label:  "Total Revenue",
    value:  "LKR 1.7M",
    change: "+21.4%",
    up:     true,
    icon:   DollarSign,
    color:  "#10B981",
    bg:     "#ECFDF5",
  },
  {
    label:  "Active Users",
    value:  "16,443",
    change: "+9.8%",
    up:     true,
    icon:   Users,
    color:  "#8B5CF6",
    bg:     "#F5F3FF",
  },
  {
    label:  "Default Rate",
    value:  "6.8%",
    change: "-1.2%",
    up:     false,
    icon:   Activity,
    color:  "#EF4444",
    bg:     "#FEF2F2",
  },
];

// ── Custom Tooltip ────────────────────────────────────────────────────────────
function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div style={{
      background: "#fff",
      border: "1px solid #F3F4F6",
      borderRadius: 10,
      padding: "10px 14px",
      boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
      fontSize: 13,
    }}>
      <p style={{ fontWeight: 600, color: "#1A1A1A", marginBottom: 6 }}>{label}</p>
      {payload.map((p: any) => (
        <p key={p.name} style={{ color: p.color, margin: "2px 0" }}>
          {p.name}: <strong>{typeof p.value === "number" && p.name === "revenue"
            ? `LKR ${p.value.toLocaleString()}`
            : p.value}
          </strong>
        </p>
      ))}
    </div>
  );
}

// ── Section Header ────────────────────────────────────────────────────────────
function ChartCard({
  title,
  subtitle,
  children,
  style,
}: {
  title:    string;
  subtitle?: string;
  children: React.ReactNode;
  style?:   React.CSSProperties;
}) {
  return (
    <div className="card" style={{ display: "flex", flexDirection: "column", gap: 4, ...style }}>
      <div style={{ marginBottom: 16 }}>
        <p style={{ fontSize: 15, fontWeight: 600, color: "#1A1A1A" }}>{title}</p>
        {subtitle && (
          <p style={{ fontSize: 12, color: "#6B7280", marginTop: 2 }}>{subtitle}</p>
        )}
      </div>
      {children}
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────
export default function Analytics() {
  return (
    <div>

      {/* Page header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Analytics</h1>
          <p className="page-subtitle">Platform performance and insights — Jan to Aug 2024</p>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          {(["1M", "3M", "6M", "1Y"] as const).map((p) => (
            <button
              key={p}
              style={{
                padding: "6px 14px",
                borderRadius: 8,
                border: "1.5px solid",
                borderColor: p === "6M" ? "#007AFF" : "#F3F4F6",
                background:  p === "6M" ? "#EFF6FF" : "#FFFFFF",
                color:       p === "6M" ? "#007AFF" : "#6B7280",
                fontSize: 13,
                fontWeight: 500,
                cursor: "pointer",
                fontFamily: "inherit",
              }}
            >
              {p}
            </button>
          ))}
        </div>
      </div>

      {/* ── Stat cards ── */}
      <div style={S.statsGrid}>
        {statCards.map((card) => {
          const Icon = card.icon;
          return (
            <div key={card.label} className="card" style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                <div>
                  <p style={{ fontSize: 13, color: "#6B7280", fontWeight: 500 }}>{card.label}</p>
                  <p style={{ fontSize: 26, fontWeight: 700, color: "#1A1A1A", marginTop: 4 }}>{card.value}</p>
                </div>
                <div style={{ width: 42, height: 42, borderRadius: 10, background: card.bg, display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <Icon size={19} color={card.color} />
                </div>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                {card.up
                  ? <TrendingUp  size={14} color="#10B981" />
                  : <TrendingDown size={14} color="#EF4444" />
                }
                <span style={{ fontSize: 12, fontWeight: 600, color: card.up ? "#10B981" : "#EF4444" }}>
                  {card.change}
                </span>
                <span style={{ fontSize: 12, color: "#9CA3AF" }}>vs last period</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* ── Row 1: Loan Overview + Repayment Rate ── */}
      <div style={S.row}>

        {/* Area chart — loans overview */}
        <ChartCard
          title="Loan Activity Overview"
          subtitle="Monthly loans issued, repayments and defaults"
          style={{ flex: 2 }}
        >
          <ResponsiveContainer width="100%" height={230}>
            <AreaChart data={monthlyOverview}>
              <defs>
                <linearGradient id="gradLoans" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="#007AFF" stopOpacity={0.15} />
                  <stop offset="95%" stopColor="#007AFF" stopOpacity={0}    />
                </linearGradient>
                <linearGradient id="gradRepay" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="#10B981" stopOpacity={0.15} />
                  <stop offset="95%" stopColor="#10B981" stopOpacity={0}    />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" vertical={false} />
              <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: "#6B7280" }} />
              <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: "#6B7280" }} />
              <Tooltip content={<CustomTooltip />} />
              <Legend
                iconType="circle"
                iconSize={8}
                wrapperStyle={{ fontSize: 12, paddingTop: 12 }}
              />
              <Area type="monotone" dataKey="loans"      name="Loans"      stroke="#007AFF" fill="url(#gradLoans)" strokeWidth={2} dot={false} />
              <Area type="monotone" dataKey="repayments" name="Repayments" stroke="#10B981" fill="url(#gradRepay)" strokeWidth={2} dot={false} />
              <Area type="monotone" dataKey="defaults"   name="Defaults"   stroke="#EF4444" fill="none"           strokeWidth={2} dot={false} strokeDasharray="4 3" />
            </AreaChart>
          </ResponsiveContainer>
        </ChartCard>

        {/* Line chart — repayment rate */}
        <ChartCard
          title="Repayment Rate"
          subtitle="Monthly % of on-time repayments"
          style={{ flex: 1 }}
        >
          <div style={{ display: "flex", alignItems: "baseline", gap: 6, marginBottom: 16 }}>
            <span style={{ fontSize: 32, fontWeight: 700, color: "#10B981" }}>93%</span>
            <span style={{ fontSize: 12, color: "#10B981", fontWeight: 500 }}>current</span>
          </div>
          <ResponsiveContainer width="100%" height={160}>
            <LineChart data={repaymentRate}>
              <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" vertical={false} />
              <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: "#6B7280" }} />
              <YAxis domain={[80, 100]} axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: "#6B7280" }} tickFormatter={(v) => `${v}%`} />
              <Tooltip formatter={(v) => [`${v}%`, "Rate"]} contentStyle={{ borderRadius: 8, border: "none", boxShadow: "0 2px 8px rgba(0,0,0,0.1)", fontSize: 12 }} />
              <Line type="monotone" dataKey="rate" stroke="#10B981" strokeWidth={2.5} dot={{ fill: "#10B981", r: 3 }} />
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>

      </div>

      {/* ── Row 2: User Growth + Loan Categories + KYC Trend ── */}
      <div style={S.row}>

        {/* Bar chart — user growth */}
        <ChartCard
          title="User Growth"
          subtitle="Borrowers vs lenders over time"
          style={{ flex: 2 }}
        >
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={userGrowth} barSize={10} barGap={4}>
              <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" vertical={false} />
              <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: "#6B7280" }} />
              <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: "#6B7280" }} />
              <Tooltip content={<CustomTooltip />} />
              <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12, paddingTop: 12 }} />
              <Bar dataKey="borrowers" name="Borrowers" fill="#007AFF" radius={[4, 4, 0, 0]} />
              <Bar dataKey="lenders"   name="Lenders"   fill="#8B5CF6" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        {/* Donut — loan categories */}
        <ChartCard
          title="Loan Categories"
          subtitle="Distribution by loan type"
          style={{ flex: 1 }}
        >
          <div style={{ display: "flex", justifyContent: "center" }}>
            <PieChart width={150} height={150}>
              <Pie
                data={loanCategories}
                cx={70} cy={70}
                innerRadius={44}
                outerRadius={68}
                paddingAngle={3}
                dataKey="value"
              >
                {loanCategories.map((entry, i) => (
                  <Cell key={i} fill={entry.color} />
                ))}
              </Pie>
            </PieChart>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 7, marginTop: 8 }}>
            {loanCategories.map((cat) => (
              <div key={cat.name} style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <div style={{ width: 9, height: 9, borderRadius: "50%", background: cat.color }} />
                  <span style={{ fontSize: 12, color: "#6B7280" }}>{cat.name}</span>
                </div>
                <span style={{ fontSize: 12, fontWeight: 600, color: "#1A1A1A" }}>{cat.value}%</span>
              </div>
            ))}
          </div>
        </ChartCard>

      </div>

      {/* ── Row 3: KYC trend full width ── */}
      <ChartCard
        title="KYC Verification Trend"
        subtitle="Monthly breakdown of KYC approvals, rejections and pending reviews"
      >
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={kycTrend} barSize={12} barGap={4}>
            <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" vertical={false} />
            <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: "#6B7280" }} />
            <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: "#6B7280" }} />
            <Tooltip content={<CustomTooltip />} />
            <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12, paddingTop: 12 }} />
            <Bar dataKey="approved" name="Approved" fill="#10B981" radius={[4, 4, 0, 0]} />
            <Bar dataKey="rejected" name="Rejected" fill="#EF4444" radius={[4, 4, 0, 0]} />
            <Bar dataKey="pending"  name="Pending"  fill="#F59E0B" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>

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
  row: {
    display: "flex",
    gap: 16,
    marginBottom: 16,
    alignItems: "flex-start",
  },
};