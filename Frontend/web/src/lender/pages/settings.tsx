import {
  useEffect,
  useMemo,
  useState,
  type FormEvent,
  type ReactNode,
} from "react";
import {
  BellRing,
  BriefcaseBusiness,
  ChartNoAxesCombined,
  Clock3,
  LogOut,
  Settings2,
  ShieldCheck,
  UserRound,
} from "lucide-react";
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

function SettingsSectionTitle({
  icon,
  title,
  description,
}: {
  icon: ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div className="settings-section-title">
      <span className="settings-section-title__icon" aria-hidden="true">
        {icon}
      </span>
      <div>
        <h2>{title}</h2>
        <p>{description}</p>
      </div>
    </div>
  );
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

  const isDirty = useMemo(
    () =>
      Boolean(
        settings &&
        formState &&
        JSON.stringify(toFormState(settings)) !== JSON.stringify(formState),
      ),
    [formState, settings],
  );

  return (
    <section className="dashboard-panel">
      <header className="page-header settings-page-header">
        <div>
          <p className="eyebrow">Workspace preferences</p>
          <h1 className="page-title">Settings</h1>
          <p className="page-subtitle">
            Configure alerts, lending defaults, and how your workspace opens.
          </p>
        </div>
        <div className="settings-save-status" aria-label="Settings save status">
          <Clock3 size={16} aria-hidden="true" />
          <span>Last saved</span>
          <strong>{formatDate(settings?.updatedAt ?? null)}</strong>
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

          <section className="settings-layout settings-layout--professional">
            <div className="settings-main-column">
              <article className="card settings-card">
                <div className="settings-card__header">
                  <SettingsSectionTitle
                    icon={<BellRing size={20} />}
                    title="Notifications"
                    description="Choose which portfolio updates you receive in the app and by email."
                  />
                </div>

                <div className="settings-channel-heading" aria-hidden="true">
                  <span>Alert</span>
                  <span>In-app</span>
                  <span>Email</span>
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
                        <label
                          className="settings-switch"
                          title="In-app notification"
                        >
                          <input
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
                          <span
                            className="settings-switch__track"
                            aria-hidden="true"
                          />
                          <span className="settings-switch__mobile-label">
                            In-app
                          </span>
                        </label>

                        <label
                          className="settings-switch"
                          title="Email notification"
                        >
                          <input
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
                          <span
                            className="settings-switch__track"
                            aria-hidden="true"
                          />
                          <span className="settings-switch__mobile-label">
                            Email
                          </span>
                        </label>
                      </div>
                    </article>
                  ))}
                </div>
              </article>

              <article className="card settings-card">
                <div className="settings-card__header">
                  <SettingsSectionTitle
                    icon={<BriefcaseBusiness size={20} />}
                    title="Lending defaults"
                    description="Set your usual offer values to keep loan advertisement setup consistent."
                  />
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
                    <small className="settings-field-hint">Months</small>
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
                    <small className="settings-field-hint">LKR</small>
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
                    <small className="settings-field-hint">LKR</small>
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
                  <SettingsSectionTitle
                    icon={<ChartNoAxesCombined size={20} />}
                    title="Workspace"
                    description="Control your starting view, reporting period, and list sizes."
                  />
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
              <article className="card settings-account-card">
                <div className="settings-account-card__top">
                  <div
                    className="settings-account-card__avatar"
                    aria-hidden="true"
                  >
                    {session.displayName.trim().charAt(0).toUpperCase() || "L"}
                  </div>
                  <div className="settings-account-card__identity">
                    <span>Lender account</span>
                    <h2>{session.displayName}</h2>
                    <p>{session.email || "Email not provided"}</p>
                  </div>
                </div>

                <div className="settings-account-card__security">
                  <ShieldCheck size={18} aria-hidden="true" />
                  <div>
                    <strong>Account access</strong>
                    <span>
                      Your profile and session controls are available here.
                    </span>
                  </div>
                </div>

                <div className="settings-side-actions">
                  <button
                    type="button"
                    className="create-ad-button create-ad-button--primary"
                    onClick={onOpenProfile}
                  >
                    <UserRound size={17} aria-hidden="true" />
                    Edit profile
                  </button>
                  <button
                    type="button"
                    className="create-ad-button create-ad-button--ghost"
                    onClick={onLogout}
                  >
                    <LogOut size={17} aria-hidden="true" />
                    Log out
                  </button>
                </div>
              </article>

              <article className="settings-assurance-card">
                <Settings2 size={20} aria-hidden="true" />
                <div>
                  <h3>Changes stay under your control</h3>
                  <p>
                    Preferences are only applied after you select Save changes.
                  </p>
                </div>
              </article>
            </aside>
          </section>

          <div
            className={`settings-actions${isDirty ? " settings-actions--dirty" : ""}`}
          >
            <div className="settings-actions__status">
              <span className="settings-actions__dot" aria-hidden="true" />
              {isDirty ? "You have unsaved changes" : "All changes are saved"}
            </div>
            <button
              type="button"
              className="create-ad-button create-ad-button--ghost"
              onClick={handleReset}
              disabled={isSaving || !isDirty}
            >
              Discard changes
            </button>
            <button
              type="submit"
              className="create-ad-button create-ad-button--primary"
              disabled={isSaving || !isDirty}
            >
              {isSaving ? "Saving..." : "Save changes"}
            </button>
          </div>
        </form>
      ) : null}
    </section>
  );
}
