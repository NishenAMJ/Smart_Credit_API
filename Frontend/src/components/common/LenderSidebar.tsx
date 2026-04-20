import { useState } from 'react'
import type { LenderSession } from '../../lib/lender-session'

type LenderView =
  | 'dashboard'
  | 'analytics'
  | 'create-ad'
  | 'pending-requests'
  | 'settings'
  | 'notifications'

type NavItem = {
  id: LenderView
  label: string
  shortLabel: string
}

const navItems: NavItem[] = [
  { id: 'dashboard', label: 'Dashboard', shortLabel: 'DB' },
  { id: 'analytics', label: 'Analytics', shortLabel: 'AN' },
  { id: 'create-ad', label: 'Create Ad', shortLabel: 'AD' },
]

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
        className={`lender-sidebar${isMobileOpen ? ' lender-sidebar--open' : ''}`}
      >
        <div className="lender-sidebar__scroll">
          <div className="lender-sidebar__logo-wrap">
            <div className="lender-sidebar__logo-inner">
              <div className="lender-sidebar__logo-icon">SC</div>
              <div>
                <div className="lender-sidebar__logo-text">Smart Credit+</div>
                <div className="lender-sidebar__logo-sub">Lender Panel</div>
              </div>
            </div>
          </div>

          <nav className="lender-sidebar__nav" aria-label="Lender navigation">
            <div className="lender-sidebar__section-label">Main Menu</div>

            {navItems.map((item) => {
              const isActive = item.id === activeView

              return (
                <button
                  key={item.id}
                  type="button"
                  className={`lender-sidebar__nav-item${
                    isActive ? ' lender-sidebar__nav-item--active' : ''
                  }`}
                  aria-current={isActive ? 'page' : undefined}
                  onClick={() => handleNavigate(item.id)}
                >
                  <span
                    className="lender-sidebar__nav-indicator"
                    aria-hidden="true"
                  />
                  <span className="lender-sidebar__nav-icon" aria-hidden="true">
                    {item.shortLabel}
                  </span>
                  <span>{item.label}</span>
                </button>
              )
            })}
          </nav>
        </div>

        <div className="lender-sidebar__bottom-wrap">
          <button
            type="button"
            className="lender-sidebar__admin-wrap lender-sidebar__profile-trigger"
            onClick={onOpenProfile}
          >
            <div className="lender-sidebar__admin-avatar">{lenderInitial}</div>
            <div>
              <div className="lender-sidebar__admin-name">{session.displayName}</div>
              <div className="lender-sidebar__admin-role">{session.lenderId}</div>
            </div>
          </button>

          <button
            type="button"
            className="lender-sidebar__logout-btn"
            onClick={onLogout}
          >
            <span className="lender-sidebar__logout-icon" aria-hidden="true">
              LO
            </span>
            <span>Log Out</span>
          </button>
        </div>
      </aside>
    </>
  )
}

export type { LenderView }
