import './App.css'
import LenderLayout from './components/layout/LenderLayout'
import type { LenderView } from './components/common/LenderSidebar'
import { useState } from 'react'
import AnalyticsPage from './pages/analytics'
import ActiveAdsRequestsPage from './pages/active-ads-requests'
import CreateAdPage from './pages/create-ad'
import DashboardPage from './pages/dashboard'
import AuthPage from './pages/auth'
import PendingRequestsPage from './pages/pending-requests'
import NotificationsPage from './pages/notifications'
import RecentTransactionsPage from './pages/recent-transactions'
import SettingsPage from './pages/settings'
import LenderProfileModal from './components/profile/LenderProfileModal'
import {
  clearStoredSession,
  getStoredSession,
  updateStoredSession,
  type LenderSession,
} from './lib/lender-session'
import type { LenderProfile } from './lib/lender-profile-api'

function App() {
  const [activeView, setActiveView] = useState<LenderView>('dashboard')
  const [session, setSession] = useState<LenderSession | null>(() =>
    getStoredSession(),
  )
  const [isProfileOpen, setIsProfileOpen] = useState(false)

  function handleLogin(sessionInput: LenderSession) {
    updateStoredSession(sessionInput)
    setSession(sessionInput)
    setActiveView('dashboard')
  }

  function handleLogout() {
    clearStoredSession()
    setSession(null)
    setActiveView('dashboard')
  }

  function handleProfileSaved(profile: LenderProfile) {
    const nextSession: LenderSession = {
      lenderId: profile.lenderId,
      displayName: profile.businessName || profile.fullName,
      email: profile.email,
      accessToken: session!.accessToken,
    }

    updateStoredSession(nextSession)
    setSession(nextSession)
  }

  const fallbackViewLabel = String(activeView)
    .replace(/-/g, ' ')
    .replace(/\b\w/g, (character: string) => character.toUpperCase())

  if (!session) {
    return <AuthPage onLogin={handleLogin} />
  }

  return (
    <>
      <LenderLayout
        activeView={activeView}
        onNavigate={setActiveView}
        session={session}
        onOpenProfile={() => setIsProfileOpen(true)}
        onLogout={handleLogout}
      >
        {activeView === 'dashboard' ? (
          <DashboardPage session={session} onNavigate={setActiveView} />
        ) : activeView === 'recent-transactions' ? (
          <RecentTransactionsPage session={session} />
        ) : activeView === 'analytics' ? (
          <AnalyticsPage session={session} onNavigate={setActiveView} />
        ) : activeView === 'active-ads-requests' ? (
          <ActiveAdsRequestsPage session={session} onNavigate={setActiveView} />
        ) : activeView === 'create-ad' ? (
          <CreateAdPage session={session} />
        ) : activeView === 'pending-requests' ? (
          <PendingRequestsPage session={session} />
        ) : activeView === 'settings' ? (
          <SettingsPage
            session={session}
            onLogout={handleLogout}
            onOpenProfile={() => setIsProfileOpen(true)}
          />
        ) : activeView === 'notifications' ? (
          <NotificationsPage session={session} onNavigate={setActiveView} />
        ) : (
          <section className="dashboard-panel">
            <header className="page-header">
              <div>
                <p className="eyebrow">Lender module</p>
                <h1 className="page-title">
                  {fallbackViewLabel}
                </h1>
                <p className="page-subtitle">
                  This lender page is reserved in the new app shell. We can build
                  this module next using the same sidebar layout and style-audit
                  tokens.
                </p>
                <p className="dashboard-context-pill">
                  Signed in as {session.displayName} - {session.lenderId}
                </p>
              </div>
            </header>

            <section className="card placeholder-card">
              <p className="placeholder-card__eyebrow">Coming next</p>
              <h2 className="section-title">Module scaffolding is ready</h2>
              <p className="section-subtitle">
                The shared lender sidebar and layout are now in place, so we can
                build this screen without changing the app structure again.
              </p>
            </section>
          </section>
        )}
      </LenderLayout>

      <LenderProfileModal
        session={session}
        isOpen={isProfileOpen}
        onClose={() => setIsProfileOpen(false)}
        onProfileSaved={handleProfileSaved}
      />
    </>
  )
}

export default App
