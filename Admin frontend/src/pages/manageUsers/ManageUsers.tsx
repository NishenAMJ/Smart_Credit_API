import { useState } from "react";
import {
  Search, Eye, Ban, CheckCircle,
  Filter, UserCheck, UserX, Users, Shield,
} from "lucide-react";

// ── Types ─────────────────────────────────────────────────────────────────────
type UserRole   = "borrower" | "lender";
type UserStatus = "verified" | "pending" | "flagged" | "suspended";

interface User {
  id:          string;
  name:        string;
  email:       string;
  phone:       string;
  role:        UserRole;
  status:      UserStatus;
  joinDate:    string;
  lastActive:  string;
  totalLoans:  number;
  riskScore:   "low" | "medium" | "high";
}

// ── Mock Data ─────────────────────────────────────────────────────────────────
const INITIAL_USERS: User[] = [
  { id: "USR001", name: "Aisha Fernando",    email: "aisha@email.com",    phone: "+94 77 123 4567", role: "borrower", status: "verified",  joinDate: "2023-06-12", lastActive: "2024-01-15", totalLoans: 3,  riskScore: "low"    },
  { id: "USR002", name: "Kasun Perera",      email: "kasun@email.com",    phone: "+94 71 234 5678", role: "lender",   status: "verified",  joinDate: "2023-04-08", lastActive: "2024-01-14", totalLoans: 12, riskScore: "low"    },
  { id: "USR003", name: "Nimal Silva",       email: "nimal@email.com",    phone: "+94 76 345 6789", role: "borrower", status: "pending",   joinDate: "2024-01-10", lastActive: "2024-01-10", totalLoans: 0,  riskScore: "medium" },
  { id: "USR004", name: "Priya Jayawardena", email: "priya@email.com",    phone: "+94 72 456 7890", role: "lender",   status: "flagged",   joinDate: "2023-09-22", lastActive: "2024-01-08", totalLoans: 5,  riskScore: "high"   },
  { id: "USR005", name: "Roshan Bandara",    email: "roshan@email.com",   phone: "+94 77 567 8901", role: "borrower", status: "suspended", joinDate: "2023-11-05", lastActive: "2023-12-20", totalLoans: 1,  riskScore: "high"   },
  { id: "USR006", name: "Dilani Rathnayake", email: "dilani@email.com",   phone: "+94 75 678 9012", role: "lender",   status: "verified",  joinDate: "2023-07-18", lastActive: "2024-01-13", totalLoans: 8,  riskScore: "low"    },
  { id: "USR007", name: "Thilanka Madushani",email: "thilanka@email.com", phone: "+94 70 789 0123", role: "borrower", status: "verified",  joinDate: "2023-08-30", lastActive: "2024-01-12", totalLoans: 2,  riskScore: "low"    },
  { id: "USR008", name: "Chamara Wijesinghe",email: "chamara@email.com",  phone: "+94 71 890 1234", role: "lender",   status: "pending",   joinDate: "2024-01-05", lastActive: "2024-01-05", totalLoans: 0,  riskScore: "medium" },
  { id: "USR009", name: "Sachini Gunaratne", email: "sachini@email.com",  phone: "+94 76 901 2345", role: "borrower", status: "flagged",   joinDate: "2023-10-14", lastActive: "2024-01-07", totalLoans: 4,  riskScore: "high"   },
  { id: "USR010", name: "Tharaka Dissanayake",email:"tharaka@email.com",  phone: "+94 72 012 3456", role: "lender",   status: "verified",  joinDate: "2023-05-27", lastActive: "2024-01-15", totalLoans: 20, riskScore: "low"    },
];

// ── Avatar colors ─────────────────────────────────────────────────────────────
const AVATAR_COLORS = [
  { color: "#007AFF", bg: "#EFF6FF" },
  { color: "#10B981", bg: "#ECFDF5" },
  { color: "#8B5CF6", bg: "#F5F3FF" },
  { color: "#F59E0B", bg: "#FFFBEB" },
  { color: "#EF4444", bg: "#FEF2F2" },
  { color: "#06B6D4", bg: "#ECFEFF" },
];

// ── Helpers ───────────────────────────────────────────────────────────────────
function StatusBadge({ status }: { status: UserStatus }) {
  const map: Record<UserStatus, string> = {
    verified:  "badge badge-success",
    pending:   "badge badge-warning",
    flagged:   "badge badge-danger",
    suspended: "badge badge-gray",
  };
  return (
    <span className={map[status]}>
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  );
}

function RiskBadge({ risk }: { risk: "low" | "medium" | "high" }) {
  const map = {
    low:    { bg: "#ECFDF5", color: "#065F46", label: "Low"    },
    medium: { bg: "#FFFBEB", color: "#92400E", label: "Medium" },
    high:   { bg: "#FEF2F2", color: "#991B1B", label: "High"   },
  };
  const s = map[risk];
  return (
    <span style={{
      background: s.bg, color: s.color,
      fontSize: 11, fontWeight: 600,
      padding: "2px 8px", borderRadius: 20,
    }}>
      {s.label}
    </span>
  );
}

function Avatar({ name, index }: { name: string; index: number }) {
  const { color, bg } = AVATAR_COLORS[index % AVATAR_COLORS.length];
  const initials = name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase();
  return (
    <div style={{
      width: 36, height: 36, borderRadius: "50%",
      background: bg, color,
      display: "flex", alignItems: "center", justifyContent: "center",
      fontSize: 12, fontWeight: 600, flexShrink: 0,
    }}>
      {initials}
    </div>
  );
}

// ── User Detail Modal ─────────────────────────────────────────────────────────
function UserModal({
  user,
  index,
  onClose,
  onSuspend,
  onActivate,
}: {
  user:       User;
  index:      number;
  onClose:    () => void;
  onSuspend:  (id: string) => void;
  onActivate: (id: string) => void;
}) {
  const { color, bg } = AVATAR_COLORS[index % AVATAR_COLORS.length];
  const initials = user.name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase();

  return (
    <div style={Mo.overlay} onClick={onClose}>
      <div style={Mo.modal} onClick={(e) => e.stopPropagation()}>

        {/* Header */}
        <div style={Mo.header}>
          <p style={Mo.title}>User Details</p>
          <button style={Mo.closeBtn} onClick={onClose}><X size={18} /></button>
        </div>

        {/* Profile */}
        <div style={Mo.section}>
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <div style={{ width: 56, height: 56, borderRadius: "50%", background: bg, color, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, fontWeight: 700, flexShrink: 0 }}>
              {initials}
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                <p style={{ fontSize: 17, fontWeight: 700, color: "#1A1A1A" }}>{user.name}</p>
                <StatusBadge status={user.status} />
              </div>
              <p style={{ fontSize: 13, color: "#6B7280", marginTop: 3 }}>{user.email}</p>
              <p style={{ fontSize: 13, color: "#6B7280" }}>{user.phone}</p>
            </div>
          </div>
        </div>

        {/* Role & Risk */}
        <div style={Mo.section}>
          <div style={{ display: "flex", gap: 12 }}>
            <div style={Mo.infoChip}>
              <p style={Mo.chipLabel}>Account Role</p>
              <p style={{ fontSize: 13, fontWeight: 600, color: user.role === "lender" ? "#007AFF" : "#8B5CF6" }}>
                {user.role.charAt(0).toUpperCase() + user.role.slice(1)}
              </p>
            </div>
            <div style={Mo.infoChip}>
              <p style={Mo.chipLabel}>Risk Score</p>
              <RiskBadge risk={user.riskScore} />
            </div>
            <div style={Mo.infoChip}>
              <p style={Mo.chipLabel}>Total Loans</p>
              <p style={{ fontSize: 13, fontWeight: 600, color: "#1A1A1A" }}>{user.totalLoans}</p>
            </div>
          </div>
        </div>

        {/* Details grid */}
        <div style={Mo.section}>
          <p style={Mo.sectionTitle}>Account Information</p>
          <div style={Mo.grid}>
            {[
              { label: "User ID",      value: user.id          },
              { label: "Join Date",    value: user.joinDate    },
              { label: "Last Active",  value: user.lastActive  },
              { label: "Phone",        value: user.phone       },
            ].map((item) => (
              <div key={item.label} style={Mo.gridItem}>
                <p style={Mo.gridLabel}>{item.label}</p>
                <p style={Mo.gridValue}>{item.value}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Actions */}
        <div style={Mo.actions}>
          {user.status !== "suspended" ? (
            <button
              className="btn-danger"
              style={{ flex: 1 }}
              onClick={() => { onSuspend(user.id); onClose(); }}
            >
              <Ban size={15} /> Suspend User
            </button>
          ) : (
            <button
              className="btn-primary"
              style={{ flex: 1 }}
              onClick={() => { onActivate(user.id); onClose(); }}
            >
              <CheckCircle size={15} /> Reactivate User
            </button>
          )}
          <button className="btn-secondary" style={{ flex: 1 }} onClick={onClose}>
            Close
          </button>
        </div>

      </div>
    </div>
  );
}

// tiny X icon used inside modal
function X({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth={2} strokeLinecap="round">
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────
export default function ManageUsers() {
  const [users, setUsers]         = useState<User[]>(INITIAL_USERS);
  const [search, setSearch]       = useState("");
  const [filterStatus, setFilter] = useState<UserStatus | "all">("all");
  const [filterRole, setRole]     = useState<UserRole | "all">("all");
  const [selected, setSelected]   = useState<{ user: User; index: number } | null>(null);

  // ── Handlers ──────────────────────────────────────────────────────────────
  function handleSuspend(id: string) {
    setUsers((prev) => prev.map((u) => u.id === id ? { ...u, status: "suspended" } : u));
  }
  function handleActivate(id: string) {
    setUsers((prev) => prev.map((u) => u.id === id ? { ...u, status: "verified"  } : u));
  }

  // ── Filtered ──────────────────────────────────────────────────────────────
  const filtered = users.filter((u) => {
    const matchSearch =
      u.name.toLowerCase().includes(search.toLowerCase())  ||
      u.email.toLowerCase().includes(search.toLowerCase()) ||
      u.id.toLowerCase().includes(search.toLowerCase());
    const matchStatus = filterStatus === "all" || u.status === filterStatus;
    const matchRole   = filterRole   === "all" || u.role   === filterRole;
    return matchSearch && matchStatus && matchRole;
  });

  // ── Counts ────────────────────────────────────────────────────────────────
  const counts = {
    all:       users.length,
    verified:  users.filter((u) => u.status === "verified").length,
    pending:   users.filter((u) => u.status === "pending").length,
    flagged:   users.filter((u) => u.status === "flagged").length,
    suspended: users.filter((u) => u.status === "suspended").length,
    lenders:   users.filter((u) => u.role   === "lender").length,
    borrowers: users.filter((u) => u.role   === "borrower").length,
  };

  return (
    <div>

      {/* Page header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Manage Users</h1>
          <p className="page-subtitle">View and manage all platform users</p>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          {counts.flagged > 0 && (
            <span style={{ background: "#FEF2F2", color: "#991B1B", borderRadius: 20, padding: "4px 12px", fontSize: 13, fontWeight: 600 }}>
              {counts.flagged} Flagged
            </span>
          )}
          <span style={{ background: "#FEF3C7", color: "#92400E", borderRadius: 20, padding: "4px 12px", fontSize: 13, fontWeight: 600 }}>
            {counts.pending} Pending
          </span>
        </div>
      </div>

      {/* ── Summary cards ── */}
      <div style={S.summaryGrid}>
        {[
          { label: "Total Users", count: counts.all,       color: "#007AFF", bg: "#EFF6FF", icon: Users       },
          { label: "Verified",    count: counts.verified,  color: "#10B981", bg: "#ECFDF5", icon: UserCheck    },
          { label: "Flagged",     count: counts.flagged,   color: "#EF4444", bg: "#FEF2F2", icon: UserX        },
          { label: "Suspended",   count: counts.suspended, color: "#6B7280", bg: "#F3F4F6", icon: Shield       },
        ].map((item) => {
          const Icon = item.icon;
          return (
            <div key={item.label} className="card" style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
              <div>
                <p style={{ fontSize: 13, color: "#6B7280", fontWeight: 500 }}>{item.label}</p>
                <p style={{ fontSize: 28, fontWeight: 700, color: item.color, marginTop: 4 }}>{item.count}</p>
              </div>
              <div style={{ width: 40, height: 40, borderRadius: 10, background: item.bg, display: "flex", alignItems: "center", justifyContent: "center" }}>
                <Icon size={18} color={item.color} />
              </div>
            </div>
          );
        })}
      </div>

      {/* ── Filters ── */}
      <div style={S.filtersRow}>

        {/* Search */}
        <div style={{ position: "relative", flex: 1, maxWidth: 300 }}>
          <Search size={15} style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "#6B7280" }} />
          <input
            className="input"
            placeholder="Search by name, email or ID..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ paddingLeft: 36, fontSize: 14 }}
          />
        </div>

        {/* Status tabs */}
        <div className="tabs">
          {(["all", "verified", "pending", "flagged", "suspended"] as const).map((s) => (
            <button
              key={s}
              className={`tab ${filterStatus === s ? "active" : ""}`}
              onClick={() => setFilter(s)}
            >
              {s.charAt(0).toUpperCase() + s.slice(1)}
              <span style={{
                marginLeft: 5,
                background: filterStatus === s ? "#EFF6FF" : "#F3F4F6",
                color:      filterStatus === s ? "#007AFF" : "#6B7280",
                borderRadius: 10, padding: "1px 6px", fontSize: 11, fontWeight: 600,
              }}>
                {counts[s]}
              </span>
            </button>
          ))}
        </div>

        {/* Role filter */}
        <div className="tabs">
          {(["all", "lender", "borrower"] as const).map((r) => (
            <button
              key={r}
              className={`tab ${filterRole === r ? "active" : ""}`}
              onClick={() => setRole(r)}
            >
              {r.charAt(0).toUpperCase() + r.slice(1)}
            </button>
          ))}
        </div>

        <button style={S.filterBtn}>
          <Filter size={15} /> Filter
        </button>

      </div>

      {/* ── Table ── */}
      <div className="table-container">
        <table>
          <thead>
            <tr>
              <th>User</th>
              <th>ID</th>
              <th>Role</th>
              <th>Risk</th>
              <th>Loans</th>
              <th>Last Active</th>
              <th>Status</th>
              <th style={{ textAlign: "center" }}>Action</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={8} style={{ textAlign: "center", padding: 40, color: "#6B7280" }}>
                  No users found.
                </td>
              </tr>
            ) : (
              filtered.map((user, index) => (
                <tr key={user.id}>

                  {/* User */}
                  <td>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <Avatar name={user.name} index={index} />
                      <div>
                        <p style={{ fontWeight: 500, fontSize: 14 }}>{user.name}</p>
                        <p style={{ fontSize: 12, color: "#6B7280" }}>{user.email}</p>
                      </div>
                    </div>
                  </td>

                  {/* ID */}
                  <td style={{ fontSize: 12, color: "#6B7280", fontFamily: "monospace" }}>
                    {user.id}
                  </td>

                  {/* Role */}
                  <td>
                    <span style={{
                      fontSize: 12, fontWeight: 500,
                      color:      user.role === "lender" ? "#007AFF" : "#8B5CF6",
                      background: user.role === "lender" ? "#EFF6FF" : "#F5F3FF",
                      padding: "3px 10px", borderRadius: 20,
                    }}>
                      {user.role.charAt(0).toUpperCase() + user.role.slice(1)}
                    </span>
                  </td>

                  {/* Risk */}
                  <td><RiskBadge risk={user.riskScore} /></td>

                  {/* Loans */}
                  <td style={{ fontSize: 14, fontWeight: 500, color: "#1A1A1A" }}>
                    {user.totalLoans}
                  </td>

                  {/* Last active */}
                  <td style={{ fontSize: 13, color: "#6B7280" }}>{user.lastActive}</td>

                  {/* Status */}
                  <td><StatusBadge status={user.status} /></td>

                  {/* Actions */}
                  <td>
                    <div style={{ display: "flex", gap: 6, justifyContent: "center" }}>

                      {/* View */}
                      <button
                        style={S.iconBtn("#6B7280", "#F3F4F6")}
                        onClick={() => setSelected({ user, index })}
                        title="View Details"
                      >
                        <Eye size={14} />
                      </button>

                      {/* Suspend */}
                      {user.status !== "suspended" && (
                        <button
                          style={S.iconBtn("#EF4444", "#FEF2F2")}
                          onClick={() => handleSuspend(user.id)}
                          title="Suspend User"
                        >
                          <Ban size={14} />
                        </button>
                      )}

                      {/* Reactivate */}
                      {user.status === "suspended" && (
                        <button
                          style={S.iconBtn("#10B981", "#ECFDF5")}
                          onClick={() => handleActivate(user.id)}
                          title="Reactivate User"
                        >
                          <CheckCircle size={14} />
                        </button>
                      )}

                    </div>
                  </td>

                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* ── Modal ── */}
      {selected && (
        <UserModal
          user={selected.user}
          index={selected.index}
          onClose={() => setSelected(null)}
          onSuspend={handleSuspend}
          onActivate={handleActivate}
        />
      )}

    </div>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────
const S = {
  summaryGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(4, 1fr)",
    gap: 16,
    marginBottom: 24,
  } as React.CSSProperties,

  filtersRow: {
    display: "flex",
    alignItems: "center",
    gap: 12,
    marginBottom: 16,
    flexWrap: "wrap",
  } as React.CSSProperties,

  filterBtn: {
    display: "flex",
    alignItems: "center",
    gap: 6,
    padding: "9px 14px",
    borderRadius: 8,
    border: "1.5px solid #F3F4F6",
    background: "#FFFFFF",
    fontSize: 13,
    fontWeight: 500,
    color: "#6B7280",
    cursor: "pointer",
    fontFamily: "inherit",
  } as React.CSSProperties,

  iconBtn: (color: string, bg: string): React.CSSProperties => ({
    width: 30,
    height: 30,
    borderRadius: 6,
    border: "none",
    background: bg,
    color,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    cursor: "pointer",
    flexShrink: 0,
  }),
};

// ── Modal Styles ──────────────────────────────────────────────────────────────
const Mo: Record<string, React.CSSProperties> = {
  overlay: {
    position: "fixed",
    inset: 0,
    background: "rgba(0,0,0,0.4)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 1000,
    padding: 24,
  },
  modal: {
    background: "#FFFFFF",
    borderRadius: 16,
    width: "100%",
    maxWidth: 480,
    boxShadow: "0 20px 60px rgba(0,0,0,0.15)",
    overflow: "hidden",
    maxHeight: "90vh",
    overflowY: "auto",
  },
  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "20px 24px",
    borderBottom: "1px solid #F3F4F6",
  },
  title:    { fontSize: 16, fontWeight: 700, color: "#1A1A1A" },
  closeBtn: {
    background: "#F3F4F6", border: "none", borderRadius: 8,
    width: 32, height: 32,
    display: "flex", alignItems: "center", justifyContent: "center",
    cursor: "pointer", color: "#6B7280",
  },
  section:      { padding: "16px 24px", borderBottom: "1px solid #F3F4F6" },
  sectionTitle: {
    fontSize: 11, fontWeight: 600, color: "#9CA3AF",
    textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 12,
  },
  infoChip:  { flex: 1, background: "#F9FAFB", borderRadius: 10, padding: "10px 14px" },
  chipLabel: { fontSize: 11, color: "#9CA3AF", fontWeight: 500, marginBottom: 6 },
  grid:      { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 },
  gridItem:  { background: "#F9FAFB", borderRadius: 8, padding: "10px 12px" },
  gridLabel: { fontSize: 11, color: "#9CA3AF", fontWeight: 500, marginBottom: 3 },
  gridValue: { fontSize: 13, fontWeight: 600, color: "#1A1A1A" },
  actions:   { display: "flex", gap: 12, padding: "16px 24px" },
};