import type { ReactNode } from 'react'
import LenderSidebar from '../common/LenderSidebar'
import type { LenderView } from '../common/LenderSidebar'

type LenderLayoutProps = {
  activeView: LenderView
  onNavigate: (view: LenderView) => void
  children: ReactNode
}

export default function LenderLayout({
  activeView,
  onNavigate,
  children,
}: LenderLayoutProps) {
  return (
    <div className="lender-layout">
      <LenderSidebar activeView={activeView} onNavigate={onNavigate} />
      <main className="lender-layout__content">{children}</main>
    </div>
  )
}
