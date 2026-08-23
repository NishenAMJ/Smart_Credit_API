import type { ReactNode } from 'react'
import LenderSidebar from '../common/LenderSidebar'
import type { LenderView } from '../common/LenderSidebar'
import type { LenderSession } from '../../lib/lender-session'

type LenderLayoutProps = {
  activeView: LenderView
  onNavigate: (view: LenderView) => void
  session: LenderSession
  onOpenProfile: () => void
  onLogout: () => void
  children: ReactNode
}

export default function LenderLayout({
  activeView,
  onNavigate,
  session,
  onOpenProfile,
  onLogout,
  children,
}: LenderLayoutProps) {
  return (
    <div className="lender-layout">
      <LenderSidebar
        activeView={activeView}
        onNavigate={onNavigate}
        session={session}
        onOpenProfile={onOpenProfile}
        onLogout={onLogout}
      />
      <main className="lender-layout__content">{children}</main>
    </div>
  )
}
