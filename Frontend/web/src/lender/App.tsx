import "./App.css";
import LenderLayout from "./components/layout/LenderLayout";
import type { LenderView } from "./components/common/LenderSidebar";
import { useEffect, useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import AnalyticsPage from "./pages/analytics";
import ActiveAdsRequestsPage from "./pages/active-ads-requests";
import CreateAdPage from "./pages/create-ad";
import DashboardPage from "./pages/dashboard";
import PendingRequestsPage from "./pages/pending-requests";
import NotificationsPage from "./pages/notifications";
import PaymentsPage from "./pages/payments";
import SettingsPage from "./pages/settings";
import AgreementsPage from "./pages/agreements";
import LenderProfileModal from "./components/profile/LenderProfileModal";
import {
  clearStoredSession,
  getSessionFromSearchParams,
  getStoredSession,
  updateStoredSession,
  type LenderSession,
} from "./lib/lender-session";
import type { LenderProfile } from "./lib/lender-profile-api";
import {
  fetchLenderSettings,
  type LenderSettings,
} from "./lib/lender-settings-api";
import { createDefaultLenderSettings } from "./lib/lender-settings-defaults";

function App() {
  const [activeView, setActiveView] = useState<LenderView>("dashboard");
  const navigate = useNavigate();
  const [session, setSession] = useState<LenderSession | null>(() => {
    const storedSession = getStoredSession();
    const handoffSession = getSessionFromSearchParams();

    if (handoffSession) {
      updateStoredSession(handoffSession);
      return handoffSession;
    }

    if (storedSession) {
      return storedSession;
    }

    return null;
  });
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [settings, setSettings] = useState<LenderSettings>(() =>
    createDefaultLenderSettings(""),
  );
  const [isSettingsBootstrapping, setIsSettingsBootstrapping] = useState(true);

  function handleLogout() {
    clearStoredSession();
    setSession(null);
    setActiveView("dashboard");
    navigate("/", { replace: true });
  }

  function handleProfileSaved(profile: LenderProfile) {
    const nextSession: LenderSession = {
      lenderId: profile.lenderId,
      displayName: profile.businessName || profile.fullName,
      email: profile.email,
      accessToken: session!.accessToken,
    };

    updateStoredSession(nextSession);
    setSession(nextSession);
  }

  useEffect(() => {
    if (!session) {
      setSettings(createDefaultLenderSettings(""));
      setIsSettingsBootstrapping(false);
      return;
    }

    let isMounted = true;
    const fallbackSettings = createDefaultLenderSettings(session.lenderId);

    const loadLenderSettings = async () => {
      try {
        setIsSettingsBootstrapping(true);
        const loadedSettings = await fetchLenderSettings();

        if (!isMounted) {
          return;
        }

        setSettings(loadedSettings);
        setActiveView(loadedSettings.workspace.defaultLandingPage);
      } catch {
        if (!isMounted) {
          return;
        }

        setSettings(fallbackSettings);
        setActiveView(fallbackSettings.workspace.defaultLandingPage);
      } finally {
        if (isMounted) {
          setIsSettingsBootstrapping(false);
        }
      }
    };

    void loadLenderSettings();

    return () => {
      isMounted = false;
    };
  }, [session?.lenderId]);

  const fallbackViewLabel = String(activeView)
    .replace(/-/g, " ")
    .replace(/\b\w/g, (character: string) => character.toUpperCase());

  if (!session) {
    return <Navigate to="/" replace />;
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
        {isSettingsBootstrapping ? (
          <section className="dashboard-panel">
            <section className="card loading-card">
              <p>Loading lender settings...</p>
            </section>
          </section>
        ) : activeView === "dashboard" ? (
          <DashboardPage
            session={session}
            onNavigate={setActiveView}
            borrowerPageSize={settings.workspace.borrowerTablePageSize}
          />
        ) : activeView === "payments" ? (
          <PaymentsPage session={session} />
        ) : activeView === "analytics" ? (
          <AnalyticsPage
            session={session}
            defaultRange={settings.workspace.defaultAnalyticsRange}
          />
        ) : activeView === "active-ads-requests" ? (
          <ActiveAdsRequestsPage session={session} onNavigate={setActiveView} />
        ) : activeView === "create-ad" ? (
          <CreateAdPage session={session} settings={settings} />
        ) : activeView === "pending-requests" ? (
          <PendingRequestsPage
            session={session}
            pageSize={settings.workspace.pendingRequestsPageSize}
          />
        ) : activeView === "settings" ? (
          <SettingsPage
            session={session}
            settings={settings}
            onSettingsUpdated={setSettings}
            onLogout={handleLogout}
            onOpenProfile={() => setIsProfileOpen(true)}
          />
        ) : activeView === "notifications" ? (
          <NotificationsPage session={session} onNavigate={setActiveView} />
        ) : activeView === "agreements" ? (
          <AgreementsPage session={session} />
        ) : (
          <section className="dashboard-panel">
            <header className="page-header">
              <div>
                <p className="eyebrow">Lender</p>
                <h1 className="page-title">{fallbackViewLabel}</h1>
                <p className="page-subtitle">Page unavailable.</p>
                <p className="dashboard-context-pill">
                  Signed in as {session.displayName}
                </p>
              </div>
            </header>

            <section className="card placeholder-card">
              <p className="placeholder-card__eyebrow">Unavailable</p>
              <h2 className="section-title">Page not ready</h2>
              <p className="section-subtitle">Check back later.</p>
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
  );
}

export default App;
