import type { CSSProperties } from "react";
import { useEffect, useMemo, useState } from "react";
import { Search, Eye, Ban, CheckCircle, Users, UserCheck, Shield } from "lucide-react";
import {
  activateUser,
  getUsers,
  getUserStats,
  suspendUser,
  type AdminUser,
  type AdminUserRole,
  type AdminUserStatus,
} from "../../lib/api";
import { DEFAULT_USER_SUSPENSION_REASON } from "../../constants/admin-actions";
import { formatFirestoreDate } from "../../lib/admin-format";

type UserRow = {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: AdminUserRole;
  status: AdminUserStatus;
  kycStatus: "approved" | "pending" | "rejected";
  creditScore: number;
  rating: number;
  joinDate: string;
  updatedAt: string;
  totalLoansCompleted: number;
  totalAmountLent: number;
  totalAmountBorrowed: number;
  suspensionReason?: string;
};

// Converts backend user records into stable table rows so rendering stays simple.
function mapApiUser(user: AdminUser): UserRow {
  const name =
    user.fullName ||
    [user.firstName, user.lastName].filter(Boolean).join(" ").trim() ||
    user.email.split("@")[0];

  return {
    id: user.id,
    name,
    email: user.email,
    phone: user.phone || "N/A",
    role: user.role,
    status: user.status ?? "active",
    kycStatus: user.kycStatus ?? "approved",
    creditScore: user.creditScore ?? 0,
    rating: user.rating ?? 0,
    joinDate: formatFirestoreDate(user.createdAt),
    updatedAt: formatFirestoreDate(user.updatedAt),
    totalLoansCompleted: user.totalLoansCompleted ?? 0,
    totalAmountLent: user.totalAmountLent ?? 0,
    totalAmountBorrowed: user.totalAmountBorrowed ?? 0,
    suspensionReason: user.suspensionReason,
  };
}

// Keeps status styling in one place so the table stays readable.
function StatusBadge({ status }: { status: AdminUserStatus }) {
  const className = {
    active: "badge badge-success",
    pending: "badge badge-warning",
    suspended: "badge badge-gray",
    inactive: "badge badge-gray",
  }[status];

  return <span className={className}>{status}</span>;
}

// Keeps role styling in one place so role meaning is obvious in the table.
function RoleBadge({ role }: { role: AdminUserRole }) {
  const styles = {
    lender: { color: "#007AFF", background: "#EFF6FF" },
    borrower: { color: "#8B5CF6", background: "#F5F3FF" },
    admin: { color: "#10B981", background: "#ECFDF5" },
  }[role];

  return (
    <span style={{ ...styles, padding: "3px 10px", borderRadius: 20, fontSize: 12, fontWeight: 600 }}>
      {role}
    </span>
  );
}

// Keeps user moderation logic and view state together on a single screen.
export default function ManageUsers() {
  const [users, setUsers] = useState<UserRow[]>([]);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState<AdminUserStatus | "all">("all");
  const [filterRole, setFilterRole] = useState<AdminUserRole | "all">("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedUser, setSelectedUser] = useState<UserRow | null>(null);
  const [stats, setStats] = useState({
    totalUsers: 0,
    activeUsers: 0,
    pendingUsers: 0,
    suspendedUsers: 0,
    borrowers: 0,
    lenders: 0,
  });

  useEffect(() => {
    // Fetches both datasets together so the page loads with consistent summary values.
    async function loadUsers() {
      try {
        const [usersResponse, statsResponse] = await Promise.all([getUsers(), getUserStats()]);
        setUsers(usersResponse.users.map(mapApiUser));
        setStats({
          totalUsers: statsResponse.stats.totalUsers,
          activeUsers: statsResponse.stats.activeUsers,
          pendingUsers: statsResponse.stats.pendingUsers,
          suspendedUsers: statsResponse.stats.suspendedUsers,
          borrowers: statsResponse.stats.borrowers,
          lenders: statsResponse.stats.lenders,
        });
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load users.");
      } finally {
        setLoading(false);
      }
    }

    void loadUsers();
  }, []);

  const filteredUsers = useMemo(() => {
    return users.filter((user) => {
      const searchValue = search.toLowerCase();
      const matchesSearch =
        user.name.toLowerCase().includes(searchValue) ||
        user.email.toLowerCase().includes(searchValue) ||
        user.id.toLowerCase().includes(searchValue);
      const matchesStatus = filterStatus === "all" || user.status === filterStatus;
      const matchesRole = filterRole === "all" || user.role === filterRole;
      return matchesSearch && matchesStatus && matchesRole;
    });
  }, [filterRole, filterStatus, search, users]);

  // Updates local state immediately after a successful backend moderation action.
  async function handleSuspend(userId: string) {
    try {
      await suspendUser(userId, DEFAULT_USER_SUSPENSION_REASON);
      setUsers((prev) => prev.map((user) => (user.id === userId ? { ...user, status: "suspended" } : user)));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to suspend user.");
    }
  }

  // Mirrors the backend reactivation result without forcing a full page reload.
  async function handleActivate(userId: string) {
    try {
      await activateUser(userId);
      setUsers((prev) => prev.map((user) => (user.id === userId ? { ...user, status: "active" } : user)));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to activate user.");
    }
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Manage Users</h1>
          <p className="page-subtitle">Users loaded from Firestore with lender and borrower credit data</p>
        </div>
        <span style={S.pendingChip}>{stats.pendingUsers} Pending</span>
      </div>

      {error && <div className="card" style={S.errorCard}>{error}</div>}

      <div style={S.summaryGrid}>
        {[
          { label: "Total Users", count: stats.totalUsers, color: "#007AFF", bg: "#EFF6FF", icon: Users },
          { label: "Active", count: stats.activeUsers, color: "#10B981", bg: "#ECFDF5", icon: UserCheck },
          { label: "Borrowers", count: stats.borrowers, color: "#8B5CF6", bg: "#F5F3FF", icon: Users },
          { label: "Suspended", count: stats.suspendedUsers, color: "#6B7280", bg: "#F3F4F6", icon: Shield },
        ].map((item) => {
          const Icon = item.icon;
          return (
            <div key={item.label} className="card" style={S.summaryCard}>
              <div>
                <p style={S.summaryLabel}>{item.label}</p>
                <p style={{ ...S.summaryValue, color: item.color }}>{loading ? "..." : item.count}</p>
              </div>
              <div style={{ ...S.iconWrap, background: item.bg }}>
                <Icon size={18} color={item.color} />
              </div>
            </div>
          );
        })}
      </div>

      <div style={S.filtersRow}>
        <div style={{ position: "relative", flex: 1, maxWidth: 320 }}>
          <Search size={15} style={S.searchIcon} />
          <input
            className="input"
            placeholder="Search by name, email or ID..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ paddingLeft: 36 }}
          />
        </div>

        <div className="tabs">
          {(["all", "active", "pending", "suspended", "inactive"] as const).map((status) => (
            <button key={status} className={`tab ${filterStatus === status ? "active" : ""}`} onClick={() => setFilterStatus(status)}>
              {status}
            </button>
          ))}
        </div>

        <div className="tabs">
          {(["all", "borrower", "lender", "admin"] as const).map((role) => (
            <button key={role} className={`tab ${filterRole === role ? "active" : ""}`} onClick={() => setFilterRole(role)}>
              {role}
            </button>
          ))}
        </div>
      </div>

      <div className="table-container">
        <table>
          <thead>
            <tr>
              <th>User</th>
              <th>Phone</th>
              <th>ID</th>
              <th>Role</th>
              <th>KYC</th>
              <th>Credit</th>
              <th>Join Date</th>
              <th>Status</th>
              <th style={{ textAlign: "center" }}>Action</th>
            </tr>
          </thead>
          <tbody>
            {filteredUsers.length === 0 ? (
              <tr>
                <td colSpan={9} style={S.emptyCell}>
                  {loading ? "Loading users..." : "No users found."}
                </td>
              </tr>
            ) : (
              filteredUsers.map((user) => (
                <tr key={user.id}>
                  <td>
                    <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                      <span style={{ fontWeight: 600 }}>{user.name}</span>
                      <span style={{ fontSize: 12, color: "#6B7280" }}>{user.email}</span>
                    </div>
                  </td>
                  <td>{user.phone}</td>
                  <td style={S.monoCell}>{user.id}</td>
                  <td><RoleBadge role={user.role} /></td>
                  <td>{user.kycStatus}</td>
                  <td>{user.creditScore}</td>
                  <td>{user.joinDate}</td>
                  <td><StatusBadge status={user.status} /></td>
                  <td>
                    <div style={S.actionRow}>
                      <button style={S.iconButton("#6B7280", "#F3F4F6")} onClick={() => setSelectedUser(user)} title="View">
                        <Eye size={14} />
                      </button>
                      {user.status === "suspended" ? (
                        <button style={S.iconButton("#10B981", "#ECFDF5")} onClick={() => void handleActivate(user.id)} title="Activate">
                          <CheckCircle size={14} />
                        </button>
                      ) : (
                        <button style={S.iconButton("#EF4444", "#FEF2F2")} onClick={() => void handleSuspend(user.id)} title="Suspend">
                          <Ban size={14} />
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

      {selectedUser && (
        <div style={S.modalOverlay} onClick={() => setSelectedUser(null)}>
          <div style={S.modal} onClick={(e) => e.stopPropagation()}>
            <div style={S.modalHeader}>
              <h3 style={{ fontSize: 18, fontWeight: 700 }}>User Details</h3>
              <button style={S.closeButton} onClick={() => setSelectedUser(null)}>×</button>
            </div>
            <div style={S.modalGrid}>
              <Detail label="Name" value={selectedUser.name} />
              <Detail label="Email" value={selectedUser.email} />
              <Detail label="Phone" value={selectedUser.phone} />
              <Detail label="Role" value={selectedUser.role} />
              <Detail label="Status" value={selectedUser.status} />
              <Detail label="KYC Status" value={selectedUser.kycStatus} />
              <Detail label="Credit Score" value={String(selectedUser.creditScore)} />
              <Detail label="Rating" value={String(selectedUser.rating)} />
              <Detail label="Join Date" value={selectedUser.joinDate} />
              <Detail label="Updated At" value={selectedUser.updatedAt} />
              <Detail label="Loans Completed" value={String(selectedUser.totalLoansCompleted)} />
              <Detail label="Total Lent" value={`LKR ${selectedUser.totalAmountLent.toLocaleString()}`} />
              <Detail label="Total Borrowed" value={`LKR ${selectedUser.totalAmountBorrowed.toLocaleString()}`} />
              <Detail label="Suspension Reason" value={selectedUser.suspensionReason || "N/A"} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Reuses one detail renderer so the modal stays consistent and easy to extend.
function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div style={S.detailCard}>
      <div style={{ fontSize: 12, color: "#6B7280", marginBottom: 4 }}>{label}</div>
      <div style={{ fontSize: 14, fontWeight: 600, color: "#111827" }}>{value}</div>
    </div>
  );
}

const S: Record<string, CSSProperties | ((color: string, bg: string) => CSSProperties)> = {
  pendingChip: {
    background: "#FEF3C7",
    color: "#92400E",
    borderRadius: 20,
    padding: "4px 12px",
    fontSize: 13,
    fontWeight: 600,
  },
  errorCard: {
    marginBottom: 16,
    color: "#991B1B",
    background: "#FEF2F2",
    border: "1px solid #FECACA",
  },
  summaryGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(4, 1fr)",
    gap: 16,
    marginBottom: 24,
  },
  summaryCard: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  summaryLabel: {
    fontSize: 13,
    color: "#6B7280",
    fontWeight: 500,
  },
  summaryValue: {
    fontSize: 28,
    fontWeight: 700,
    marginTop: 4,
  },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: 10,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  filtersRow: {
    display: "flex",
    alignItems: "center",
    gap: 12,
    marginBottom: 16,
    flexWrap: "wrap",
  },
  searchIcon: {
    position: "absolute",
    left: 12,
    top: "50%",
    transform: "translateY(-50%)",
    color: "#6B7280",
  },
  emptyCell: {
    textAlign: "center",
    padding: 40,
    color: "#6B7280",
  },
  monoCell: {
    fontFamily: "monospace",
    fontSize: 12,
    color: "#6B7280",
  },
  actionRow: {
    display: "flex",
    gap: 6,
    justifyContent: "center",
  },
  iconButton: (color: string, bg: string) => ({
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
  }),
  modalOverlay: {
    position: "fixed",
    inset: 0,
    background: "rgba(0,0,0,0.45)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 1000,
  },
  modal: {
    width: "min(680px, 92vw)",
    background: "#FFFFFF",
    borderRadius: 18,
    padding: 24,
  },
  modalHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  closeButton: {
    border: "none",
    background: "transparent",
    fontSize: 24,
    cursor: "pointer",
    color: "#6B7280",
  },
  modalGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
    gap: 12,
  },
  detailCard: {
    background: "#F8FAFC",
    border: "1px solid #E2E8F0",
    borderRadius: 12,
    padding: 14,
  },
};
