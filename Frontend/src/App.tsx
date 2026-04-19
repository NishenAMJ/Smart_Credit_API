import './App.css'
import LenderLayout from './components/layout/LenderLayout'
import type { LenderView } from './components/common/LenderSidebar'
import { useState } from 'react'
import AnalyticsPage from './pages/analytics'
import DashboardPage from './pages/dashboard'
import AuthPage from './pages/auth'
import {
  clearStoredSession,
  getStoredSession,
  registerTemporaryLender,
  signInWithLenderId,
  type LenderSession,
} from './lib/lender-session'

function App() {
  const [activeView, setActiveView] = useState<LenderView>('dashboard')
  const [session, setSession] = useState<LenderSession | null>(() =>
    getStoredSession(),
  )

  function handleLogin(input: LenderSession) {
    const nextSession = signInWithLenderId(input.lenderId)
    setSession(nextSession)
    setActiveView('dashboard')
  }

  function handleSignUp(input: LenderSession) {
    const nextSession = registerTemporaryLender(input)
    setSession(nextSession)
    setActiveView('dashboard')
  }

  function handleLogout() {
    clearStoredSession()
    setSession(null)
    setActiveView('dashboard')
  }

  if (!session) {
    return <AuthPage onLogin={handleLogin} onSignUp={handleSignUp} />
  }

  return (
    <LenderLayout
      activeView={activeView}
      onNavigate={setActiveView}
      session={session}
      onLogout={handleLogout}
    >
      {activeView === 'dashboard' ? (
        <DashboardPage session={session} />
      ) : activeView === 'analytics' ? (
        <AnalyticsPage session={session} />
      ) : (
        <section className="dashboard-panel">
          <header className="page-header">
            <div>
              <p className="eyebrow">Lender module</p>
              <h1 className="page-title">
                {activeView
                  .replace(/-/g, ' ')
                  .replace(/\b\w/g, (character) => character.toUpperCase())}
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
  )
}

export default App
