import type { ReactNode } from 'react'
import LenderSidebar from '../common/LenderSidebar'
import type { LenderView } from '../common/LenderSidebar'
import type { LenderSession } from '../../lib/lender-session'

type LenderLayoutProps = {
  activeView: LenderView
  onNavigate: (view: LenderView) => void
  session: LenderSession
  onLogout: () => void
  children: ReactNode
}

export default function LenderLayout({
  activeView,
  onNavigate,
  session,
  onLogout,
  children,
}: LenderLayoutProps) {
  return (
    <div className="lender-layout">
      <LenderSidebar
        activeView={activeView}
        onNavigate={onNavigate}
        session={session}
        onLogout={onLogout}
      />
      <main className="lender-layout__content">{children}</main>
    </div>
  )
}
