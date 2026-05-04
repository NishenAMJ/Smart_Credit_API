import { useEffect, useState, type JSX } from "react";
import type { LenderSession } from "../../lib/lender-session";

type LenderView =
  | "dashboard"
  | "recent-transactions"
  | "analytics"
  | "active-ads-requests"
  | "create-ad"
  | "pending-requests"
  | "settings"
  | "notifications"
  | "agreements";

type NavItem = {
  id: LenderView;
  label: string;
  icon: () => JSX.Element;
};

function DashboardIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
    >
      <rect x="4.5" y="4.5" width="6.5" height="6.5" rx="1.5" />
      <rect x="13" y="4.5" width="6.5" height="6.5" rx="1.5" />
      <rect x="4.5" y="13" width="6.5" height="6.5" rx="1.5" />
      <rect x="13" y="13" width="6.5" height="6.5" rx="1.5" />
    </svg>
  );
}

function TransactionsIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
    >
      <rect x="4" y="5.5" width="16" height="13" rx="2.5" />
      <path d="M4 10h16" />
      <path d="M8 14h3.5" />
      <path d="M14.5 14H16" />
    </svg>
  );
}

function AnalyticsIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
    >
      <path d="M5 19.5h14" />
      <path d="M8 17V11" />
      <path d="M12 17V7" />
      <path d="M16 17v-4" />
    </svg>
  );
}

function CreateAdIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
    >
      <path d="M12 5v14" />
      <path d="M5 12h14" />
      <rect x="4.5" y="4.5" width="15" height="15" rx="3" />
    </svg>
  );
}

function SidebarToggleIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
    >
      <rect x="4.5" y="5" width="15" height="14" rx="2.5" />
      <path d="M10 5v14" />
      <rect
        x="6.5"
        y="7.5"
        width="1.5"
        height="9"
        rx="0.75"
        fill="currentColor"
        stroke="none"
      />
    </svg>
  );
}

function AgreementsIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
      <polyline points="14 2 14 8 20 8"></polyline>
      <line x1="16" y1="13" x2="8" y2="13"></line>
      <line x1="16" y1="17" x2="8" y2="17"></line>
      <polyline points="10 9 9 9 8 9"></polyline>
    </svg>
  );
}

const navItems: NavItem[] = [
  { id: "dashboard", label: "Dashboard", icon: DashboardIcon },
  { id: "recent-transactions", label: "Payments", icon: TransactionsIcon },
  { id: "analytics", label: "Analytics", icon: AnalyticsIcon },
  { id: "create-ad", label: "Create Ad", icon: CreateAdIcon },
  { id: "agreements", label: "Agreements", icon: AgreementsIcon },
];

const SIDEBAR_COLLAPSE_STORAGE_KEY = "smart-credit:lender-sidebar-collapsed";

function LogoutIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
    >
      <path d="M10 6H7.75A2.75 2.75 0 0 0 5 8.75v6.5A2.75 2.75 0 0 0 7.75 18H10" />
      <path d="M13 8.5 17 12l-4 3.5" />
      <path d="M9 12h8" />
    </svg>
  );
}

type LenderSidebarProps = {
  activeView: LenderView;
  onNavigate: (view: LenderView) => void;
  session: LenderSession;
  onOpenProfile: () => void;
  onLogout: () => void;
};

export default function LenderSidebar({
  activeView,
  onNavigate,
  session,
  onOpenProfile,
  onLogout,
}: LenderSidebarProps) {
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [isDesktopCollapsed, setIsDesktopCollapsed] = useState(() => {
    if (typeof window === "undefined") {
      return false;
    }

    return window.localStorage.getItem(SIDEBAR_COLLAPSE_STORAGE_KEY) === "true";
  });

  useEffect(() => {
    window.localStorage.setItem(
      SIDEBAR_COLLAPSE_STORAGE_KEY,
      String(isDesktopCollapsed),
    );
  }, [isDesktopCollapsed]);

  const handleNavigate = (view: LenderView) => {
    onNavigate(view);
    setIsMobileOpen(false);
  };

  const lenderInitial = (session.displayName || session.lenderId || "L")
    .slice(0, 1)
    .toUpperCase();

  return (
    <>
      <div className="lender-sidebar__mobile-bar">
        <div className="lender-sidebar__logo-inner">
          <div className="lender-sidebar__logo-icon">SC</div>
          <div>
            <div className="lender-sidebar__logo-text">Smart Credit+</div>
            <div className="lender-sidebar__logo-sub">Lender Panel</div>
          </div>
        </div>

        <button
          type="button"
          className="lender-sidebar__mobile-toggle"
          aria-expanded={isMobileOpen}
          aria-label={isMobileOpen ? "Close menu" : "Open menu"}
          onClick={() => setIsMobileOpen((open) => !open)}
        >
          {isMobileOpen ? "Close" : "Menu"}
        </button>
      </div>

      {isMobileOpen ? (
        <button
          type="button"
          className="lender-sidebar__backdrop"
          aria-label="Close menu"
          onClick={() => setIsMobileOpen(false)}
        />
      ) : null}

      <aside
        className={`lender-sidebar${isMobileOpen ? " lender-sidebar--open" : ""}${
          isDesktopCollapsed ? " lender-sidebar--collapsed" : ""
        }`}
      >
        <div className="lender-sidebar__scroll">
          <div className="lender-sidebar__logo-wrap">
            <div className="lender-sidebar__logo-inner">
              <button
                type="button"
                className="lender-sidebar__collapse-toggle"
                aria-label={
                  isDesktopCollapsed ? "Expand sidebar" : "Collapse sidebar"
                }
                title={
                  isDesktopCollapsed ? "Expand sidebar" : "Collapse sidebar"
                }
                onClick={() => setIsDesktopCollapsed((current) => !current)}
              >
                <span
                  aria-hidden="true"
                  className="lender-sidebar__collapse-icon"
                >
                  <SidebarToggleIcon />
                </span>
              </button>

              <div className="lender-sidebar__logo-icon">SC</div>
              <div className="lender-sidebar__brand-copy">
                <div className="lender-sidebar__logo-text">Smart Credit+</div>
                <div className="lender-sidebar__logo-sub">Lender Panel</div>
              </div>
            </div>
          </div>

          <nav className="lender-sidebar__nav" aria-label="Lender navigation">
            {navItems.map((item) => {
              const isActive = item.id === activeView;
              const Icon = item.icon;

              return (
                <button
                  key={item.id}
                  type="button"
                  className={`lender-sidebar__nav-item${
                    isActive ? " lender-sidebar__nav-item--active" : ""
                  }`}
                  aria-current={isActive ? "page" : undefined}
                  title={isDesktopCollapsed ? item.label : undefined}
                  onClick={() => handleNavigate(item.id)}
                >
                  <span
                    className="lender-sidebar__nav-indicator"
                    aria-hidden="true"
                  />
                  <span className="lender-sidebar__nav-icon" aria-hidden="true">
                    <Icon />
                  </span>
                  <span className="lender-sidebar__nav-label">
                    {item.label}
                  </span>
                </button>
              );
            })}
          </nav>
        </div>

        <div className="lender-sidebar__bottom-wrap">
          <div className="lender-sidebar__account-row">
            <button
              type="button"
              className="lender-sidebar__admin-wrap lender-sidebar__profile-trigger"
              onClick={onOpenProfile}
              title={isDesktopCollapsed ? session.displayName : undefined}
            >
              <div className="lender-sidebar__admin-avatar">
                {lenderInitial}
              </div>
              <div className="lender-sidebar__profile-copy">
                <div className="lender-sidebar__admin-name">
                  {session.displayName}
                </div>
                <div className="lender-sidebar__admin-role">
                  {session.lenderId}
                </div>
              </div>
            </button>

            <button
              type="button"
              className="lender-sidebar__logout-icon-button"
              aria-label="Log out"
              title="Log out"
              onClick={onLogout}
            >
              <span className="lender-sidebar__logout-icon" aria-hidden="true">
                <LogoutIcon />
              </span>
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}

export type { LenderView };
