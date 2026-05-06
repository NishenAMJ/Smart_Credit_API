// Renders the lender navigation, mobile menu, and account actions.
import { useEffect, useState } from "react";
import type { LenderSession } from "../../lib/lender-session";
import {
  lenderViewRegistry,
  type LenderView,
} from "../../config/lender-views";

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

// Persists the desktop collapse preference across reloads.
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
  // Hidden lender views still exist in the app, but only marked entries appear in the sidebar.
  const navItems = lenderViewRegistry.filter((item) => item.showInSidebar);
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [isDesktopCollapsed, setIsDesktopCollapsed] = useState(() => {
    if (typeof window === "undefined") {
      return false;
    }

    return window.localStorage.getItem(SIDEBAR_COLLAPSE_STORAGE_KEY) === "true";
  });

  useEffect(() => {
    // Persist the collapse state so the desktop shell reopens the way the lender left it.
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
                <div className="lender-sidebar__admin-role">Lender</div>
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
