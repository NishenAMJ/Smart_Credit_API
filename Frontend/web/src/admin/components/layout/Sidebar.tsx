import { NavLink, useNavigate } from "react-router-dom";
import {
  LayoutDashboard,
  ShieldCheck,
  Megaphone,
  Users,
  MessageSquareWarning,
  BarChart2,
  ReceiptText,
  ScrollText,
  Settings,
  LogOut,
  FileText,
} from "lucide-react";

// ── Nav items ────────────────────────────────────────────────────────────────
const NAV_ITEMS = [
  { to: "/admin/dashboard",    icon: LayoutDashboard, label: "Dashboard"     },
  { to: "/admin/kyc",          icon: ShieldCheck,     label: "KYC Approvals" },
  { to: "/admin/lender-ads",   icon: Megaphone,       label: "Lender Ads"    },
  { to: "/admin/manage-users", icon: Users,           label: "Manage Users"  },
  { to: "/admin/disputes",     icon: MessageSquareWarning, label: "Disputes" },
  { to: "/admin/analytics",    icon: BarChart2,       label: "Analytics"     },
  { to: "/admin/transactions", icon: ReceiptText,     label: "Transactions"  },
  { to: "/admin/agreements",   icon: FileText,        label: "Agreements"    },
  { to: "/admin/audit-logs",   icon: ScrollText,      label: "Audit Logs"    },
  { to: "/admin/settings",     icon: Settings,        label: "Settings"      },
];

// ── Styles ───────────────────────────────────────────────────────────────────
const S = {
  sidebar: {
    width: "220px",
    minHeight: "100vh",
    background: "#0A1628",
    display: "flex",
    flexDirection: "column" as const,
    padding: "24px 0",
    flexShrink: 0,
  },
  logoWrap: {
    padding: "0 20px 28px",
    borderBottom: "1px solid rgba(255,255,255,0.06)",
    marginBottom: "16px",
  },
  logoInner: {
    display: "flex",
    alignItems: "center",
    gap: "10px",
  },
  logoIcon: {
    width: "34px",
    height: "34px",
    borderRadius: "9px",
    background: "#007AFF",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "13px",
    fontWeight: 700,
    color: "#fff",
    flexShrink: 0,
  },
  logoText: {
    color: "#FFFFFF",
    fontWeight: 700,
    fontSize: "14px",
    lineHeight: 1.3,
  },
  logoSub: {
    color: "#8A9BB5",
    fontSize: "11px",
    fontWeight: 400,
  },
  nav: {
    flex: 1,
    padding: "0 12px",
    display: "flex",
    flexDirection: "column" as const,
    gap: "2px",
  },
  sectionLabel: {
    fontSize: "10px",
    fontWeight: 600,
    color: "#4A5568",
    letterSpacing: "0.08em",
    textTransform: "uppercase" as const,
    padding: "12px 12px 6px",
  },
  bottomWrap: {
    padding: "16px 12px 0",
    borderTop: "1px solid rgba(255,255,255,0.06)",
    marginTop: "8px",
  },
  logoutBtn: {
    display: "flex",
    alignItems: "center",
    gap: "10px",
    width: "100%",
    padding: "10px 12px",
    borderRadius: "8px",
    background: "transparent",
    border: "none",
    color: "#8A9BB5",
    fontSize: "14px",
    fontWeight: 500,
    cursor: "pointer",
    transition: "color 0.15s, background 0.15s",
    fontFamily: "inherit",
  },
  adminWrap: {
    display: "flex",
    alignItems: "center",
    gap: "10px",
    padding: "12px",
    marginBottom: "8px",
  },
  adminAvatar: {
    width: "34px",
    height: "34px",
    borderRadius: "50%",
    background: "#007AFF",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "13px",
    fontWeight: 600,
    color: "#fff",
    flexShrink: 0,
  },
  adminName: {
    color: "#FFFFFF",
    fontSize: "13px",
    fontWeight: 600,
  },
  adminRole: {
    color: "#8A9BB5",
    fontSize: "11px",
    fontWeight: 400,
  },
};

// ── Component ─────────────────────────────────────────────────────────────────
export default function Sidebar() {
  const navigate = useNavigate();

  function handleLogout() {
    localStorage.removeItem("adminToken");
    navigate("/admin/signin");
  }

  return (
    <aside style={S.sidebar}>

      {/* Logo */}
      <div style={S.logoWrap}>
        <div style={S.logoInner}>
          <div style={S.logoIcon}>SC</div>
          <div>
            <div style={S.logoText}>Smart Credit+</div>
            <div style={S.logoSub}>Admin Panel</div>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav style={S.nav}>
        <div style={S.sectionLabel}>Main Menu</div>

        {NAV_ITEMS.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            style={({ isActive }) => ({
              display: "flex",
              alignItems: "center",
              gap: "10px",
              padding: "10px 12px",
              borderRadius: "8px",
              textDecoration: "none",
              fontSize: "14px",
              fontWeight: 500,
              color: isActive ? "#FFFFFF" : "#8A9BB5",
              background: isActive
                ? "rgba(0, 122, 255, 0.85)"
                : "transparent",
              transition: "background 0.15s, color 0.15s",
              position: "relative",
            })}
            onMouseEnter={(e) => {
              const el = e.currentTarget;
              if (!el.classList.contains("active")) {
                el.style.background = "rgba(255,255,255,0.05)";
                el.style.color = "#FFFFFF";
              }
            }}
            onMouseLeave={(e) => {
              const el = e.currentTarget;
              if (!el.classList.contains("active")) {
                el.style.background = "transparent";
                el.style.color = "#8A9BB5";
              }
            }}
          >
            {({ isActive }) => (
              <>
                {/* Active indicator bar */}
                {isActive && (
                  <span
                    style={{
                      position: "absolute",
                      left: 0,
                      top: "50%",
                      transform: "translateY(-50%)",
                      width: "3px",
                      height: "60%",
                      background: "#FFFFFF",
                      borderRadius: "0 3px 3px 0",
                    }}
                  />
                )}
                <Icon
                  size={17}
                  style={{ flexShrink: 0, opacity: isActive ? 1 : 0.7 }}
                />
                {label}
              </>
            )}
          </NavLink>
        ))}
      </nav>

      {/* Bottom section — admin info + logout */}
      <div style={S.bottomWrap}>

        {/* Admin profile */}
        <div style={S.adminWrap}>
          <div style={S.adminAvatar}>A</div>
          <div>
            <div style={S.adminName}>Admin</div>
            <div style={S.adminRole}>Super Admin</div>
          </div>
        </div>

        {/* Logout button */}
        <button
          style={S.logoutBtn}
          onClick={handleLogout}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = "rgba(255,255,255,0.05)";
            e.currentTarget.style.color = "#FFFFFF";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = "transparent";
            e.currentTarget.style.color = "#8A9BB5";
          }}
        >
          <LogOut size={17} style={{ flexShrink: 0 }} />
          Log Out
        </button>

      </div>
    </aside>
  );
}
