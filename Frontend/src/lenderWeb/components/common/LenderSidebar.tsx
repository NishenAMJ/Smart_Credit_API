import { useEffect, useState } from 'react'
import {
  CreditCard,
  Landmark,
  LayoutDashboard,
  LogOut,
  Megaphone,
  PanelLeftClose,
  UsersRound,
  type LucideIcon,
} from 'lucide-react'
import type { LenderSession } from '../../lib/lender-session'

type LenderView =
  | 'dashboard'
  | 'loans'
  | 'borrowers'
  | 'recent-transactions'
  | 'analytics'
  | 'active-ads-requests'
  | 'create-ad'
  | 'pending-requests'
  | 'settings'
  | 'notifications'

type NavItem = {
  id: LenderView
  label: string
  icon: LucideIcon
}

const navItems: NavItem[] = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'loans', label: 'Loans', icon: Landmark },
  { id: 'borrowers', label: 'Borrowers', icon: UsersRound },
  { id: 'recent-transactions', label: 'Payments', icon: CreditCard },
  { id: 'active-ads-requests', label: 'Advertisements', icon: Megaphone },
]

const SIDEBAR_COLLAPSE_STORAGE_KEY = 'smart-credit:lender-sidebar-collapsed'

type LenderSidebarProps = {
  activeView: LenderView
  onNavigate: (view: LenderView) => void
  session: LenderSession
  onOpenProfile: () => void
  onLogout: () => void
}

export default function LenderSidebar({
  activeView,
  onNavigate,
  session,
  onOpenProfile,
  onLogout,
}: LenderSidebarProps) {
  const [isMobileOpen, setIsMobileOpen] = useState(false)
  const [isDesktopCollapsed, setIsDesktopCollapsed] = useState(() => {
    if (typeof window === 'undefined') {
      return false
    }

    return window.localStorage.getItem(SIDEBAR_COLLAPSE_STORAGE_KEY) === 'true'
  })

  useEffect(() => {
    window.localStorage.setItem(
      SIDEBAR_COLLAPSE_STORAGE_KEY,
      String(isDesktopCollapsed),
    )
  }, [isDesktopCollapsed])

  const handleNavigate = (view: LenderView) => {
    onNavigate(view)
    setIsMobileOpen(false)
  }

  const lenderInitial = (session.displayName || session.lenderId || 'L')
    .slice(0, 1)
    .toUpperCase()

  return (
    <>
      <div className="lender-sidebar__mobile-bar">
        <div className="lender-sidebar__logo-inner">
          <div className="lender-sidebar__logo-icon"><Landmark size={20} /></div>
          <div>
            <div className="lender-sidebar__logo-text">Smart Credit+</div>
            <div className="lender-sidebar__logo-sub">Lender Panel</div>
          </div>
        </div>

        <button
          type="button"
          className="lender-sidebar__mobile-toggle"
          aria-expanded={isMobileOpen}
          aria-label={isMobileOpen ? 'Close menu' : 'Open menu'}
          onClick={() => setIsMobileOpen((open) => !open)}
        >
          {isMobileOpen ? 'Close' : 'Menu'}
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
        className={`lender-sidebar${isMobileOpen ? ' lender-sidebar--open' : ''}${
          isDesktopCollapsed ? ' lender-sidebar--collapsed' : ''
        }`}
      >
        <div className="lender-sidebar__scroll">
          <div className="lender-sidebar__logo-wrap">
            <div className="lender-sidebar__logo-inner">
              <button
                type="button"
                className="lender-sidebar__collapse-toggle"
                aria-label={isDesktopCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
                title={isDesktopCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
                onClick={() => setIsDesktopCollapsed((current) => !current)}
              >
                <span aria-hidden="true" className="lender-sidebar__collapse-icon">
                  <PanelLeftClose />
                </span>
              </button>

              <div className="lender-sidebar__logo-icon"><Landmark size={20} /></div>
              <div className="lender-sidebar__brand-copy">
                <div className="lender-sidebar__logo-text">Smart Credit+</div>
                <div className="lender-sidebar__logo-sub">Lender Panel</div>
              </div>
            </div>
          </div>

          <nav className="lender-sidebar__nav" aria-label="Lender navigation">
            {navItems.map((item) => {
              const isActive = item.id === activeView
              const Icon = item.icon

              return (
                <button
                  key={item.id}
                  type="button"
                  className={`lender-sidebar__nav-item${
                    isActive ? ' lender-sidebar__nav-item--active' : ''
                  }`}
                  aria-current={isActive ? 'page' : undefined}
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
                  <span className="lender-sidebar__nav-label">{item.label}</span>
                </button>
              )
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
              <div className="lender-sidebar__admin-avatar">{lenderInitial}</div>
              <div className="lender-sidebar__profile-copy">
                <div className="lender-sidebar__admin-name">{session.displayName}</div>
                <div className="lender-sidebar__admin-role">{session.lenderId}</div>
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
                <LogOut />
              </span>
            </button>
          </div>
        </div>
      </aside>
    </>
  )
}

export type { LenderView }
