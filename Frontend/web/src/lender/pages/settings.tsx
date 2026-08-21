import { useEffect, useMemo, useState, type FormEvent } from "react";
import {
  BellRing,
  Building2,
  Check,
  ChevronRight,
  CircleAlert,
  Clock3,
  LogOut,
  MessageSquareText,
  RefreshCw,
  ShieldCheck,
  Smartphone,
  UserRound,
} from "lucide-react";
import type { LenderView } from "../components/common/LenderSidebar";
import type { LenderSession } from "../lib/lender-session";
import {
  fetchLenderProfile,
  type LenderProfile,
} from "../lib/lender-profile-api";
import {
  fetchLenderSettings,
  updateLenderSettings,
  type LenderSettings,
  type LenderSettingsNotifications,
} from "../lib/lender-settings-api";

type SettingsPageProps = {
  session: LenderSession;
  onLogout: () => void;
  onOpenProfile: () => void;
  onNavigate: (view: LenderView) => void;
};

const notificationPreferences = [
  {
    title: "Loan requests",
    description: "New applications and changes to their review status.",
    icon: UserRound,
    inAppKeys: ["inAppNewRequests", "inAppStatusUpdates"],
  },
  {
    title: "Payments",
    description: "Received repayments and overdue installment warnings.",
    icon: Check,
    inAppKeys: ["inAppTransactions", "inAppOverdues"],
  },
  {
    title: "Advertisements",
    description: "Reminders when an active advertisement is about to expire.",
    icon: BellRing,
    inAppKeys: ["inAppAdExpiry"],
  },
  {
    title: "Disputes",
    description: "Updates that require attention on an open dispute case.",
    icon: ShieldCheck,
    inAppKeys: ["inAppDisputes"],
  },
] as const;

type PreferenceKey = keyof LenderSettingsNotifications;

function formatDate(value: string | null | undefined): string {
  if (!value) return "Not updated yet";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Not updated yet";
  return new Intl.DateTimeFormat("en-LK", {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(date);
}

function titleCase(value: string): string {
  return value
    .replace(/_/g, " ")
    .replace(/\b\w/g, (character) => character.toUpperCase());
}

function allEnabled(
  notifications: LenderSettingsNotifications,
  keys: readonly PreferenceKey[],
): boolean {
  return keys.every((key) => notifications[key]);
}

export default function SettingsPage({
  session,
  onLogout,
  onOpenProfile,
  onNavigate,
}: SettingsPageProps) {
  const [settings, setSettings] = useState<LenderSettings | null>(null);
  const [notifications, setNotifications] =
    useState<LenderSettingsNotifications | null>(null);
  const [profile, setProfile] = useState<LenderProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [profileWarning, setProfileWarning] = useState<string | null>(null);
  const [savedMessage, setSavedMessage] = useState<string | null>(null);

  async function loadPage() {
    setIsLoading(true);
    setError(null);
    setProfileWarning(null);

    const [settingsResult, profileResult] = await Promise.allSettled([
      fetchLenderSettings(session.lenderId),
      fetchLenderProfile(session.lenderId),
    ]);

    if (settingsResult.status === "fulfilled") {
      setSettings(settingsResult.value);
      setNotifications({ ...settingsResult.value.notifications });
    } else {
      setError(
        settingsResult.reason instanceof Error
          ? settingsResult.reason.message
          : "Failed to load notification settings.",
      );
    }

    if (profileResult.status === "fulfilled") {
      setProfile(profileResult.value);
    } else {
      setProfileWarning("Profile details are temporarily unavailable.");
    }

    setIsLoading(false);
  }

  useEffect(() => {
    void loadPage();
    // The lender ID is the identity boundary for both requests.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session.lenderId]);

  useEffect(() => {
    if (!savedMessage) return;
    const timeout = window.setTimeout(() => setSavedMessage(null), 3000);
    return () => window.clearTimeout(timeout);
  }, [savedMessage]);

  const isDirty = useMemo(
    () =>
      Boolean(
        settings &&
        notifications &&
        JSON.stringify(settings.notifications) !==
          JSON.stringify(notifications),
      ),
    [notifications, settings],
  );

  function updateChannel(keys: readonly PreferenceKey[], enabled: boolean) {
    setNotifications((current) => {
      if (!current) return current;
      const next = { ...current };
      keys.forEach((key) => {
        next[key] = enabled;
      });
      return next;
    });
    setSavedMessage(null);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!notifications || !isDirty) return;

    try {
      setIsSaving(true);
      setError(null);
      const updated = await updateLenderSettings(session.lenderId, {
        notifications,
      });
      setSettings(updated);
      setNotifications({ ...updated.notifications });
      setSavedMessage("Notification preferences saved.");
    } catch (saveError) {
      setError(
        saveError instanceof Error
          ? saveError.message
          : "Failed to save notification preferences.",
      );
    } finally {
      setIsSaving(false);
    }
  }

  const displayName =
    profile?.businessName || profile?.fullName || session.displayName;
  const kycStatus = profile?.kycStatus || "unknown";

  return (
    <section className="dashboard-panel settings-workspace">
      <header className="page-header settings-workspace__header">
        <div>
          <p className="eyebrow">Account controls</p>
          <h1 className="page-title">Settings</h1>
          <p className="page-subtitle">
            Manage your account, alerts, communications, and active session.
          </p>
        </div>
        <button
          type="button"
          className="settings-refresh-button"
          onClick={() => void loadPage()}
          disabled={isLoading || isSaving}
          aria-label="Reload settings"
          title="Reload settings"
        >
          <RefreshCw size={17} className={isLoading ? "is-spinning" : ""} />
        </button>
      </header>

      {error ? (
        <div
          className="settings-feedback settings-feedback--error"
          role="alert"
        >
          <CircleAlert size={18} />
          <span>{error}</span>
        </div>
      ) : null}
      {savedMessage ? (
        <div
          className="settings-feedback settings-feedback--success"
          role="status"
        >
          <Check size={18} />
          <span>{savedMessage}</span>
        </div>
      ) : null}

      {isLoading && !notifications ? (
        <section className="card loading-card">
          <p>Loading your settings...</p>
        </section>
      ) : (
        <div className="settings-workspace__grid">
          <main className="settings-workspace__main">
            <section className="settings-panel settings-profile-summary">
              <div className="settings-profile-summary__identity">
                <div
                  className="settings-profile-summary__avatar"
                  aria-hidden="true"
                >
                  {displayName.trim().charAt(0).toUpperCase() || "L"}
                </div>
                <div>
                  <span className="settings-panel__eyebrow">
                    Lender account
                  </span>
                  <h2>{displayName}</h2>
                  <p>
                    {profile?.email || session.email || "Email not provided"}
                  </p>
                </div>
              </div>
              <div className="settings-profile-summary__meta">
                <span
                  className={`settings-kyc-badge settings-kyc-badge--${kycStatus.toLowerCase()}`}
                >
                  <ShieldCheck size={15} />
                  {kycStatus === "unknown"
                    ? "KYC unavailable"
                    : `KYC ${titleCase(kycStatus)}`}
                </span>
                <span>
                  <Clock3 size={15} />
                  Profile updated {formatDate(profile?.updatedAt)}
                </span>
              </div>
              {profileWarning ? (
                <p className="settings-profile-warning">{profileWarning}</p>
              ) : null}
              <button
                type="button"
                className="settings-primary-button"
                onClick={onOpenProfile}
              >
                <UserRound size={17} />
                Edit profile
              </button>
            </section>

            <form className="settings-panel" onSubmit={handleSubmit}>
              <div className="settings-panel__header">
                <div>
                  <span className="settings-panel__eyebrow">Preferences</span>
                  <h2>Notifications</h2>
                  <p>
                    Choose how Smart Credit alerts you about important activity.
                  </p>
                </div>
                <div className="settings-channel-legend" aria-hidden="true">
                  <span>
                    <Smartphone size={15} /> In-app
                  </span>
                </div>
              </div>

              {notifications ? (
                <div className="settings-preference-list">
                  {notificationPreferences.map((preference) => {
                    const Icon = preference.icon;
                    const inAppEnabled = allEnabled(
                      notifications,
                      preference.inAppKeys,
                    );
                    return (
                      <div
                        className="settings-preference-row"
                        key={preference.title}
                      >
                        <span
                          className="settings-preference-row__icon"
                          aria-hidden="true"
                        >
                          <Icon size={18} />
                        </span>
                        <div className="settings-preference-row__copy">
                          <h3>{preference.title}</h3>
                          <p>{preference.description}</p>
                        </div>
                        <div className="settings-preference-row__channels">
                          <label
                            className="settings-switch"
                            title={`${preference.title} in-app alerts`}
                          >
                            <input
                              type="checkbox"
                              checked={inAppEnabled}
                              onChange={(event) =>
                                updateChannel(
                                  preference.inAppKeys,
                                  event.target.checked,
                                )
                              }
                            />
                            <span
                              className="settings-switch__track"
                              aria-hidden="true"
                            />
                            <span className="settings-switch__mobile-label">
                              In-app
                            </span>
                          </label>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="settings-inline-empty">
                  Notification preferences could not be loaded. Use reload to
                  try again.
                </div>
              )}

              <div className="settings-save-row">
                <span>
                  {isDirty
                    ? "You have unsaved changes."
                    : "Preferences are up to date."}
                </span>
                <div>
                  <button
                    type="button"
                    className="settings-secondary-button"
                    disabled={!isDirty || isSaving}
                    onClick={() =>
                      settings &&
                      setNotifications({ ...settings.notifications })
                    }
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="settings-primary-button"
                    disabled={!isDirty || isSaving}
                  >
                    {isSaving ? "Saving..." : "Save preferences"}
                  </button>
                </div>
              </div>
            </form>
          </main>

          <aside className="settings-workspace__side">
            <section className="settings-panel settings-quick-links">
              <div className="settings-panel__header">
                <div>
                  <span className="settings-panel__eyebrow">Communication</span>
                  <h2>Message controls</h2>
                </div>
              </div>
              <button type="button" onClick={() => onNavigate("notifications")}>
                <span className="settings-quick-links__icon">
                  <BellRing size={18} />
                </span>
                <span>
                  <strong>Notification inbox</strong>
                  <small>Review alerts and unread activity</small>
                </span>
                <ChevronRight size={17} />
              </button>
              <button type="button" onClick={() => onNavigate("sms")}>
                <span className="settings-quick-links__icon">
                  <MessageSquareText size={18} />
                </span>
                <span>
                  <strong>SMS messages</strong>
                  <small>Manage payment messages and sending</small>
                </span>
                <ChevronRight size={17} />
              </button>
            </section>

            <section className="settings-panel settings-account-details">
              <div className="settings-panel__header">
                <div>
                  <span className="settings-panel__eyebrow">
                    Business details
                  </span>
                  <h2>Account overview</h2>
                </div>
              </div>
              <dl>
                <div>
                  <dt>
                    <Building2 size={15} /> Business
                  </dt>
                  <dd>{profile?.businessName || "Not provided"}</dd>
                </div>
                <div>
                  <dt>Registration</dt>
                  <dd>{profile?.businessRegistrationNo || "Not provided"}</dd>
                </div>
                <div>
                  <dt>Phone</dt>
                  <dd>{profile?.phone || "Not provided"}</dd>
                </div>
                <div>
                  <dt>Location</dt>
                  <dd>
                    {[profile?.city, profile?.district]
                      .filter(Boolean)
                      .join(", ") || "Not provided"}
                  </dd>
                </div>
              </dl>
            </section>

            <section className="settings-panel settings-session-card">
              <div>
                <span className="settings-panel__eyebrow">Security</span>
                <h2>Current session</h2>
                <p>You are signed in as {session.email || displayName}.</p>
              </div>
              <button
                type="button"
                className="settings-logout-button"
                onClick={onLogout}
              >
                <LogOut size={17} />
                Log out securely
              </button>
            </section>
          </aside>
        </div>
      )}
    </section>
  );
}
