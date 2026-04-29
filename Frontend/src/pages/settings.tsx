import { useEffect, useState, type FormEvent } from "react";
import type { LenderSession } from "../lib/lender-session";
import {
  fetchLenderSettings,
  updateLenderSettings,
  type DefaultAnalyticsRange,
  type DefaultLandingPage,
  type LenderSettings,
  type LenderSettingsNotifications,
} from "../lib/lender-settings-api";

type SettingsPageProps = {
  session: LenderSession;
  onLogout: () => void;
  onOpenProfile: () => void;
};

type SettingsFormState = {
  notifications: LenderSettingsNotifications;
  lendingDefaults: {
    defaultInterestRate: string;
    defaultMaxTenureMonths: string;
    defaultMinAmount: string;
    defaultMaxAmount: string;
    preferredPurposes: string;
    preferredRegions: string;
    defaultResponseTimeHours: string;
  };
  workspace: {
    defaultLandingPage: DefaultLandingPage;
    defaultAnalyticsRange: DefaultAnalyticsRange;
    pendingRequestsPageSize: string;
    borrowerTablePageSize: string;
  };
};

const notificationPreferences = [
  {
    title: "New loan requests",
    description:
      "Alert this lender when a borrower request enters the pipeline.",
    inAppKey: "inAppNewRequests",
    emailKey: "emailNewRequests",
  },
  {
    title: "Repayment transactions",
    description: "Notify when lender-owned loans receive repayment activity.",
    inAppKey: "inAppTransactions",
    emailKey: "emailTransactions",
  },
  {
    title: "Request status updates",
    description: "Notify when borrower requests move between review stages.",
    inAppKey: "inAppStatusUpdates",
    emailKey: "emailStatusUpdates",
  },
  {
    title: "Overdue payment alerts",
    description: "Highlight repayment stress in the active loan portfolio.",
    inAppKey: "inAppOverdues",
    emailKey: "emailOverdues",
  },
  {
    title: "Ad expiry reminders",
    description: "Remind the lender when published ads are close to expiring.",
    inAppKey: "inAppAdExpiry",
    emailKey: "emailAdExpiry",
  },
  {
    title: "Dispute alerts",
    description: "Flag open disputes so lender support can respond quickly.",
    inAppKey: "inAppDisputes",
    emailKey: "emailDisputes",
  },
] as const satisfies Array<{
  title: string;
  description: string;
  inAppKey: keyof LenderSettingsNotifications;
  emailKey: keyof LenderSettingsNotifications;
}>;

function toFormState(settings: LenderSettings): SettingsFormState {
  return {
    notifications: { ...settings.notifications },
    lendingDefaults: {
      defaultInterestRate: String(settings.lendingDefaults.defaultInterestRate),
      defaultMaxTenureMonths: String(
        settings.lendingDefaults.defaultMaxTenureMonths,
      ),
      defaultMinAmount: String(settings.lendingDefaults.defaultMinAmount),
      defaultMaxAmount: String(settings.lendingDefaults.defaultMaxAmount),
      preferredPurposes: settings.lendingDefaults.preferredPurposes.join(", "),
      preferredRegions: settings.lendingDefaults.preferredRegions.join(", "),
      defaultResponseTimeHours: String(
        settings.lendingDefaults.defaultResponseTimeHours,
      ),
    },
    workspace: {
      defaultLandingPage: settings.workspace.defaultLandingPage,
      defaultAnalyticsRange: settings.workspace.defaultAnalyticsRange,
      pendingRequestsPageSize: String(
        settings.workspace.pendingRequestsPageSize,
      ),
      borrowerTablePageSize: String(settings.workspace.borrowerTablePageSize),
    },
  };
}

function splitList(value: string): string[] {
  return value
    .split(",")
    .map((entry) => entry.trim())
    .filter((entry) => entry.length > 0);
}

function formatDate(value: string | null): string {
  if (!value) {
    return "Not updated yet";
  }

  const parsed = new Date(value);

  if (Number.isNaN(parsed.getTime())) {
    return "Not updated yet";
  }

  return new Intl.DateTimeFormat("en-LK", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(parsed);
}

export default function SettingsPage({
  session,
  onLogout,
  onOpenProfile,
}: SettingsPageProps) {
  const [settings, setSettings] = useState<LenderSettings | null>(null);
  const [formState, setFormState] = useState<SettingsFormState | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    const loadSettings = async () => {
      try {
        setIsLoading(true);
        setError(null);
        setSuccessMessage(null);
        const loadedSettings = await fetchLenderSettings(session.lenderId);

        if (isMounted) {
          setSettings(loadedSettings);
          setFormState(toFormState(loadedSettings));
        }
      } catch (loadError) {
        if (isMounted) {
          setError(
            loadError instanceof Error
              ? loadError.message
              : "Failed to load lender settings.",
          );
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    void loadSettings();

    return () => {
      isMounted = false;
    };
  }, [session.lenderId]);

  useEffect(() => {
    if (!successMessage) {
      return;
    }

    const timeout = window.setTimeout(() => setSuccessMessage(null), 2800);
    return () => window.clearTimeout(timeout);
  }, [successMessage]);

  function updateNotification(
    key: keyof LenderSettingsNotifications,
    value: boolean,
  ) {
    setFormState((current) =>
      current
        ? {
            ...current,
            notifications: {
              ...current.notifications,
              [key]: value,
            },
          }
        : current,
    );
  }

  function updateLendingField<
    Key extends keyof SettingsFormState["lendingDefaults"],
  >(key: Key, value: SettingsFormState["lendingDefaults"][Key]) {
    setFormState((current) =>
      current
        ? {
            ...current,
            lendingDefaults: {
              ...current.lendingDefaults,
              [key]: value,
            },
          }
        : current,
    );
  }

  function updateWorkspaceField<
    Key extends keyof SettingsFormState["workspace"],
  >(key: Key, value: SettingsFormState["workspace"][Key]) {
    setFormState((current) =>
      current
        ? {
            ...current,
            workspace: {
              ...current.workspace,
              [key]: value,
            },
          }
        : current,
    );
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!formState) {
      return;
    }

    try {
      setIsSaving(true);
      setError(null);
      const updatedSettings = await updateLenderSettings(session.lenderId, {
        notifications: formState.notifications,
        lendingDefaults: {
          defaultInterestRate: Number(
            formState.lendingDefaults.defaultInterestRate,
          ),
          defaultMaxTenureMonths: Number(
            formState.lendingDefaults.defaultMaxTenureMonths,
          ),
          defaultMinAmount: Number(formState.lendingDefaults.defaultMinAmount),
          defaultMaxAmount: Number(formState.lendingDefaults.defaultMaxAmount),
          preferredPurposes: splitList(
            formState.lendingDefaults.preferredPurposes,
          ),
          preferredRegions: splitList(
            formState.lendingDefaults.preferredRegions,
          ),
          defaultResponseTimeHours: Number(
            formState.lendingDefaults.defaultResponseTimeHours,
          ),
        },
        workspace: {
          defaultLandingPage: formState.workspace.defaultLandingPage,
          defaultAnalyticsRange: formState.workspace.defaultAnalyticsRange,
          pendingRequestsPageSize: Number(
            formState.workspace.pendingRequestsPageSize,
          ),
          borrowerTablePageSize: Number(
            formState.workspace.borrowerTablePageSize,
          ),
        },
      });

      setSettings(updatedSettings);
      setFormState(toFormState(updatedSettings));
      setSuccessMessage("Settings saved successfully.");
    } catch (saveError) {
      setError(
        saveError instanceof Error
          ? saveError.message
          : "Failed to save lender settings.",
      );
    } finally {
      setIsSaving(false);
    }
  }

  function handleReset() {
    if (!settings) {
      return;
    }

    setFormState(toFormState(settings));
    setError(null);
    setSuccessMessage("Changes reset to the last saved version.");
  }

  return (
    <section className="dashboard-panel">
      <header className="page-header">
        <div>
          <p className="eyebrow">Lender preferences</p>
          <h1 className="page-title">Settings</h1>
          <p className="page-subtitle">
            Manage lender preferences, workspace defaults, and alert behavior
            without changing your main business profile.
          </p>
          <p className="dashboard-context-pill">
            Signed in as {session.displayName} - {session.lenderId}
          </p>
        </div>
      </header>

      {isLoading ? (
        <section className="card loading-card">
          <p>Loading settings...</p>
        </section>
      ) : error && !formState ? (
        <section className="card error-card">
          <h2>Settings are not available yet</h2>
          <p>{error}</p>
          <p>
            Check the lender settings API, Firebase connection, and whether the
            lender record exists in Firestore.
          </p>
        </section>
      ) : formState ? (
        <form className="settings-form" onSubmit={handleSubmit}>
          {successMessage ? (
            <p className="create-ad-banner create-ad-banner--primary">
              {successMessage}
            </p>
          ) : null}
          {error ? (
            <p className="create-ad-banner create-ad-banner--error">{error}</p>
          ) : null}

          <section className="settings-layout">
            <div className="settings-main-column">
              <article className="card settings-card">
                <div className="settings-card__header">
                  <div>
                    <h2 className="section-title">Notification Preferences</h2>
                    <p className="section-subtitle">
                      Choose how lender alerts should appear while email
                      delivery stays preference-only for now.
                    </p>
                  </div>
                  <p className="settings-card__meta">
                    Last updated {formatDate(settings?.updatedAt ?? null)}
                  </p>
                </div>

                <div className="settings-toggle-list">
                  {notificationPreferences.map((preference) => (
                    <article
                      className="settings-toggle-row"
                      key={preference.title}
                    >
                      <div>
                        <h3 className="settings-toggle-row__title">
                          {preference.title}
                        </h3>
                        <p className="settings-toggle-row__description">
                          {preference.description}
                        </p>
                      </div>

                      <div className="settings-toggle-row__controls">
                        <label className="settings-channel-toggle">
                          <input
                            className="settings-channel-toggle__control"
                            type="checkbox"
                            checked={
                              formState.notifications[preference.inAppKey]
                            }
                            onChange={(event) =>
                              updateNotification(
                                preference.inAppKey,
                                event.target.checked,
                              )
                            }
                          />
                          <span>In-app</span>
                        </label>

                        <label className="settings-channel-toggle">
                          <input
                            className="settings-channel-toggle__control"
                            type="checkbox"
                            checked={
                              formState.notifications[preference.emailKey]
                            }
                            onChange={(event) =>
                              updateNotification(
                                preference.emailKey,
                                event.target.checked,
                              )
                            }
                          />
                          <span>Email</span>
                        </label>
                      </div>
                    </article>
                  ))}
                </div>
              </article>

              <article className="card settings-card">
                <div className="settings-card__header">
                  <div>
                    <h2 className="section-title">Lending Defaults</h2>
                    <p className="section-subtitle">
                      Save the offer terms you want ready when ad creation and
                      lender workflows start using these defaults.
                    </p>
                  </div>
                </div>

                <div className="create-ad-form-grid">
                  <label className="create-ad-field">
                    <span className="create-ad-field__label">
                      Default interest rate %
                    </span>
                    <input
                      className="input"
                      type="number"
                      min="0"
                      step="0.1"
                      value={formState.lendingDefaults.defaultInterestRate}
                      onChange={(event) =>
                        updateLendingField(
                          "defaultInterestRate",
                          event.target.value,
                        )
                      }
                    />
                  </label>

                  <label className="create-ad-field">
                    <span className="create-ad-field__label">
                      Default maximum tenure
                    </span>
                    <input
                      className="input"
                      type="number"
                      min="1"
                      value={formState.lendingDefaults.defaultMaxTenureMonths}
                      onChange={(event) =>
                        updateLendingField(
                          "defaultMaxTenureMonths",
                          event.target.value,
                        )
                      }
                    />
                  </label>

                  <label className="create-ad-field">
                    <span className="create-ad-field__label">
                      Default minimum amount
                    </span>
                    <input
                      className="input"
                      type="number"
                      min="0"
                      value={formState.lendingDefaults.defaultMinAmount}
                      onChange={(event) =>
                        updateLendingField(
                          "defaultMinAmount",
                          event.target.value,
                        )
                      }
                    />
                  </label>

                  <label className="create-ad-field">
                    <span className="create-ad-field__label">
                      Default maximum amount
                    </span>
                    <input
                      className="input"
                      type="number"
                      min="0"
                      value={formState.lendingDefaults.defaultMaxAmount}
                      onChange={(event) =>
                        updateLendingField(
                          "defaultMaxAmount",
                          event.target.value,
                        )
                      }
                    />
                  </label>

                  <label className="create-ad-field create-ad-field--full">
                    <span className="create-ad-field__label">
                      Preferred purposes
                    </span>
                    <input
                      className="input"
                      type="text"
                      value={formState.lendingDefaults.preferredPurposes}
                      onChange={(event) =>
                        updateLendingField(
                          "preferredPurposes",
                          event.target.value,
                        )
                      }
                      placeholder="Working capital, Education, Medical"
                    />
                  </label>

                  <label className="create-ad-field create-ad-field--full">
                    <span className="create-ad-field__label">
                      Preferred regions
                    </span>
                    <input
                      className="input"
                      type="text"
                      value={formState.lendingDefaults.preferredRegions}
                      onChange={(event) =>
                        updateLendingField(
                          "preferredRegions",
                          event.target.value,
                        )
                      }
                      placeholder="Colombo, Kandy, Galle"
                    />
                  </label>

                  <label className="create-ad-field">
                    <span className="create-ad-field__label">
                      Default response time (hours)
                    </span>
                    <input
                      className="input"
                      type="number"
                      min="1"
                      max="72"
                      value={formState.lendingDefaults.defaultResponseTimeHours}
                      onChange={(event) =>
                        updateLendingField(
                          "defaultResponseTimeHours",
                          event.target.value,
                        )
                      }
                    />
                  </label>
                </div>
              </article>

              <article className="card settings-card">
                <div className="settings-card__header">
                  <div>
                    <h2 className="section-title">Workspace Preferences</h2>
                    <p className="section-subtitle">
                      Set the lender workspace defaults that future modules will
                      use for navigation and table behavior.
                    </p>
                  </div>
                </div>

                <div className="create-ad-form-grid">
                  <label className="create-ad-field">
                    <span className="create-ad-field__label">
                      Default landing page
                    </span>
                    <select
                      className="pending-requests-select__control"
                      value={formState.workspace.defaultLandingPage}
                      onChange={(event) =>
                        updateWorkspaceField(
                          "defaultLandingPage",
                          event.target.value as DefaultLandingPage,
                        )
                      }
                    >
                      <option value="dashboard">Dashboard</option>
                      <option value="analytics">Analytics</option>
                    </select>
                  </label>

                  <label className="create-ad-field">
                    <span className="create-ad-field__label">
                      Default analytics range
                    </span>
                    <select
                      className="pending-requests-select__control"
                      value={formState.workspace.defaultAnalyticsRange}
                      onChange={(event) =>
                        updateWorkspaceField(
                          "defaultAnalyticsRange",
                          event.target.value as DefaultAnalyticsRange,
                        )
                      }
                    >
                      <option value="30d">30 Days</option>
                      <option value="90d">90 Days</option>
                      <option value="365d">12 Months</option>
                    </select>
                  </label>

                  <label className="create-ad-field">
                    <span className="create-ad-field__label">
                      Pending requests page size
                    </span>
                    <input
                      className="input"
                      type="number"
                      min="1"
                      max="100"
                      value={formState.workspace.pendingRequestsPageSize}
                      onChange={(event) =>
                        updateWorkspaceField(
                          "pendingRequestsPageSize",
                          event.target.value,
                        )
                      }
                    />
                  </label>

                  <label className="create-ad-field">
                    <span className="create-ad-field__label">
                      Borrower table page size
                    </span>
                    <input
                      className="input"
                      type="number"
                      min="1"
                      max="100"
                      value={formState.workspace.borrowerTablePageSize}
                      onChange={(event) =>
                        updateWorkspaceField(
                          "borrowerTablePageSize",
                          event.target.value,
                        )
                      }
                    />
                  </label>
                </div>
              </article>
            </div>

            <aside className="settings-side-column">
              <article className="card settings-card settings-card--compact">
                <div className="settings-card__header">
                  <div>
                    <h2 className="section-title">Session And Access</h2>
                    <p className="section-subtitle">
                      Temporary auth is active now. Stronger security controls
                      can plug in later without replacing these preferences.
                    </p>
                  </div>
                </div>

                <div className="settings-session-list">
                  <div className="settings-session-item">
                    <span className="settings-session-item__label">
                      Lender ID
                    </span>
                    <strong>{session.lenderId}</strong>
                  </div>
                  <div className="settings-session-item">
                    <span className="settings-session-item__label">
                      Display name
                    </span>
                    <strong>{session.displayName}</strong>
                  </div>
                  <div className="settings-session-item">
                    <span className="settings-session-item__label">Email</span>
                    <strong>
                      {session.email || "No email in temporary session"}
                    </strong>
                  </div>
                </div>

                <p className="settings-side-note">
                  Business identity fields stay in the sidebar profile editor so
                  settings can stay focused on lender preferences.
                </p>

                <div className="settings-side-actions">
                  <button
                    type="button"
                    className="create-ad-button"
                    onClick={onOpenProfile}
                  >
                    Open Profile Editor
                  </button>
                  <button
                    type="button"
                    className="create-ad-button create-ad-button--ghost"
                    onClick={onLogout}
                  >
                    Log Out
                  </button>
                </div>
              </article>

              <article className="card settings-card settings-card--muted">
                <div className="settings-card__header">
                  <div>
                    <h2 className="section-title">Danger Zone</h2>
                    <p className="section-subtitle">
                      Reserved for future high-impact account controls.
                    </p>
                  </div>
                </div>

                <div className="settings-danger-list">
                  <p>
                    Data export, lender deactivation, and destructive workspace
                    actions will be added here after real auth and approval
                    flows are in place.
                  </p>
                  <button type="button" className="create-ad-button" disabled>
                    Export Data Soon
                  </button>
                  <button
                    type="button"
                    className="create-ad-button create-ad-button--ghost"
                    disabled
                  >
                    Deactivate Account Soon
                  </button>
                </div>
              </article>
            </aside>
          </section>

          <div className="settings-actions">
            <button
              type="button"
              className="create-ad-button create-ad-button--ghost"
              onClick={handleReset}
              disabled={isSaving}
            >
              Reset Changes
            </button>
            <button
              type="submit"
              className="create-ad-button create-ad-button--primary"
              disabled={isSaving}
            >
              {isSaving ? "Saving..." : "Save Settings"}
            </button>
          </div>
        </form>
      ) : null}
    </section>
  );
}
