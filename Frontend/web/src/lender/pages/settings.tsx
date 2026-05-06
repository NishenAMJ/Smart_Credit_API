import {
  useEffect,
  useState,
  type ElementType,
  type FormEvent,
  type KeyboardEvent,
  type ReactNode,
} from "react";
import {
  AlertTriangle,
  Bell,
  Briefcase,
  Check,
  Eye,
  EyeOff,
  LayoutDashboard,
  Lock,
  LogOut,
  Shield,
  User,
} from "lucide-react";
import { changeLenderPassword } from "../lib/auth-api";
import type { LenderSession } from "../lib/lender-session";
import {
  updateLenderSettings,
  type DefaultAnalyticsRange,
  type DefaultLandingPage,
  type LenderSettings,
  type LenderSettingsNotifications,
} from "../lib/lender-settings-api";

type SettingsPageProps = {
  session: LenderSession;
  settings: LenderSettings;
  onSettingsUpdated: (settings: LenderSettings) => void;
  onLogout: () => void;
  onOpenProfile: () => void;
};

type SettingsTab = "notifications" | "lending" | "workspace" | "account";

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

type PasswordFormState = {
  current: string;
  next: string;
  confirm: string;
};

const TABS: Array<{
  id: SettingsTab;
  label: string;
  description: string;
  icon: ElementType;
}> = [
  {
    id: "notifications",
    label: "Notifications",
    description: "Alerts and email",
    icon: Bell,
  },
  {
    id: "lending",
    label: "Lending",
    description: "Default loan values",
    icon: Briefcase,
  },
  {
    id: "workspace",
    label: "Workspace",
    description: "Startup defaults",
    icon: LayoutDashboard,
  },
  {
    id: "account",
    label: "Account",
    description: "Profile and access",
    icon: Shield,
  },
];

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

function SettingsSection({
  title,
  subtitle,
  children,
  actions,
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <article className="settings-panel">
      <div className="settings-panel__header">
        <div>
          <h2 className="settings-panel__title">{title}</h2>
          {subtitle ? (
            <p className="settings-panel__subtitle">{subtitle}</p>
          ) : null}
        </div>
        {actions ? <div className="settings-panel__actions">{actions}</div> : null}
      </div>
      <div className="settings-panel__body">{children}</div>
    </article>
  );
}

function FieldRow({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <div className="settings-field-row">
      <div className="settings-field-row__copy">
        <p className="settings-field-row__label">{label}</p>
        {hint ? <p className="settings-field-row__hint">{hint}</p> : null}
      </div>
      <div className="settings-field-row__control">{children}</div>
    </div>
  );
}

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

function getInitials(value: string): string {
  const parts = value
    .split(" ")
    .map((part) => part.trim())
    .filter(Boolean)
    .slice(0, 2);

  if (parts.length === 0) {
    return "LD";
  }

  return parts.map((part) => part[0]?.toUpperCase() ?? "").join("");
}

function countEnabledChannels(notifications: LenderSettingsNotifications): number {
  return Object.values(notifications).filter(Boolean).length;
}

export default function SettingsPage({
  session,
  settings,
  onSettingsUpdated,
  onLogout,
  onOpenProfile,
}: SettingsPageProps) {
  const [activeTab, setActiveTab] = useState<SettingsTab>("notifications");
  const [formState, setFormState] = useState<SettingsFormState>(() =>
    toFormState(settings),
  );
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [passwordForm, setPasswordForm] = useState<PasswordFormState>({
    current: "",
    next: "",
    confirm: "",
  });
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNextPassword, setShowNextPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [passwordSuccess, setPasswordSuccess] = useState<string | null>(null);

  useEffect(() => {
    setFormState(toFormState(settings));
  }, [settings]);

  useEffect(() => {
    setError(null);
    setSuccessMessage(null);
    setPasswordError(null);
    setPasswordSuccess(null);
    setPasswordForm({
      current: "",
      next: "",
      confirm: "",
    });
  }, [session.lenderId]);

  useEffect(() => {
    if (!successMessage) {
      return;
    }

    const timeout = window.setTimeout(() => setSuccessMessage(null), 2800);
    return () => window.clearTimeout(timeout);
  }, [successMessage]);

  useEffect(() => {
    if (!passwordSuccess) {
      return;
    }

    const timeout = window.setTimeout(() => setPasswordSuccess(null), 2800);
    return () => window.clearTimeout(timeout);
  }, [passwordSuccess]);

  function updateNotification(
    key: keyof LenderSettingsNotifications,
    value: boolean,
  ) {
    setFormState((current) => ({
      ...current,
      notifications: {
        ...current.notifications,
        [key]: value,
      },
    }));
  }

  function updateLendingField<
    Key extends keyof SettingsFormState["lendingDefaults"],
  >(key: Key, value: SettingsFormState["lendingDefaults"][Key]) {
    setFormState((current) => ({
      ...current,
      lendingDefaults: {
        ...current.lendingDefaults,
        [key]: value,
      },
    }));
  }

  function updateWorkspaceField<
    Key extends keyof SettingsFormState["workspace"],
  >(key: Key, value: SettingsFormState["workspace"][Key]) {
    setFormState((current) => ({
      ...current,
      workspace: {
        ...current.workspace,
        [key]: value,
      },
    }));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    try {
      setIsSaving(true);
      setError(null);

      const updatedSettings = await updateLenderSettings({
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

      onSettingsUpdated(updatedSettings);
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
    setFormState(toFormState(settings));
    setError(null);
    setSuccessMessage("Changes reset to the last saved version.");
  }

  function handlePasswordFieldKeyDown(
    event: KeyboardEvent<HTMLInputElement>,
  ) {
    if (event.key !== "Enter") {
      return;
    }

    event.preventDefault();
    void handlePasswordChange();
  }

  async function handlePasswordChange() {
    setPasswordError(null);
    setPasswordSuccess(null);

    if (
      !passwordForm.current.trim() ||
      !passwordForm.next.trim() ||
      !passwordForm.confirm.trim()
    ) {
      setPasswordError("Please fill in all password fields.");
      return;
    }

    if (passwordForm.next.length < 8) {
      setPasswordError("New password must be at least 8 characters.");
      return;
    }

    if (passwordForm.next !== passwordForm.confirm) {
      setPasswordError("New passwords do not match.");
      return;
    }

    try {
      setPasswordSaving(true);
      const response = await changeLenderPassword(
        passwordForm.current,
        passwordForm.next,
      );

      setPasswordForm({
        current: "",
        next: "",
        confirm: "",
      });
      setPasswordSuccess(response.message || "Password updated successfully.");
    } catch (passwordUpdateError) {
      setPasswordError(
        passwordUpdateError instanceof Error
          ? passwordUpdateError.message
          : "Failed to update password.",
      );
    } finally {
      setPasswordSaving(false);
    }
  }

  const enabledChannelCount = countEnabledChannels(formState.notifications);
  const lenderInitials = getInitials(session.displayName);

  return (
    <section className="dashboard-panel">
      <form className="settings-form" onSubmit={handleSubmit}>
        <header className="page-header">
          <div>
            <p className="eyebrow">Settings</p>
            <h1 className="page-title">Settings</h1>
            <p className="page-subtitle">Manage lender settings.</p>
            <p className="dashboard-context-pill">{session.displayName}</p>
          </div>

          <button
            type="submit"
            className="create-ad-button create-ad-button--primary"
            disabled={isSaving}
          >
            <Check size={15} /> {isSaving ? "Saving..." : "Save Changes"}
          </button>
        </header>

        {successMessage ? (
          <p className="create-ad-banner create-ad-banner--primary">
            {successMessage}
          </p>
        ) : null}
        {error ? (
          <p className="create-ad-banner create-ad-banner--error">{error}</p>
        ) : null}

        <section className="settings-layout">
          <aside className="settings-side-column">
            <article className="settings-profile-card">
              <div className="settings-profile-card__avatar">{lenderInitials}</div>
              <p className="settings-profile-card__name">{session.displayName}</p>
              <p className="settings-profile-card__role">Lender</p>
              <span className="settings-profile-card__badge">Account</span>
              <p className="settings-profile-card__meta">
                Last updated {formatDate(settings.updatedAt)}
              </p>
            </article>

            <nav className="settings-tab-nav" aria-label="Settings sections">
              {TABS.map(({ id, label, description, icon: Icon }) => (
                <button
                  key={id}
                  type="button"
                  className={`settings-tab-button${
                    activeTab === id ? " settings-tab-button--active" : ""
                  }`}
                  onClick={() => setActiveTab(id)}
                >
                  <span className="settings-tab-button__icon">
                    <Icon size={16} />
                  </span>
                  <span className="settings-tab-button__copy">
                    <span className="settings-tab-button__label">{label}</span>
                    <span className="settings-tab-button__description">
                      {description}
                    </span>
                  </span>
                </button>
              ))}
            </nav>
          </aside>

          <div className="settings-main-column">
            {activeTab === "notifications" ? (
              <div className="settings-tab-stack">
                <SettingsSection
                  title="Alert Preferences"
                  subtitle="Choose alert channels."
                  actions={
                    <p className="settings-panel__meta">
                      {enabledChannelCount} channels enabled
                    </p>
                  }
                >
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
                </SettingsSection>
              </div>
            ) : null}

            {activeTab === "lending" ? (
              <div className="settings-tab-stack">
                <SettingsSection
                  title="Lending Defaults"
                  subtitle="Default values for lender offers."
                >
                  <FieldRow
                    label="Default interest rate (%)"
                    hint="Default starting rate."
                  >
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
                  </FieldRow>

                  <FieldRow
                    label="Default maximum tenure"
                    hint="Maximum tenure in months."
                  >
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
                  </FieldRow>

                  <FieldRow
                    label="Default minimum amount"
                    hint="Minimum amount."
                  >
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
                  </FieldRow>

                  <FieldRow
                    label="Default maximum amount"
                    hint="Maximum amount."
                  >
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
                  </FieldRow>

                  <FieldRow
                    label="Preferred purposes"
                    hint="Comma-separated purposes."
                  >
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
                  </FieldRow>

                  <FieldRow
                    label="Preferred regions"
                    hint="Comma-separated regions."
                  >
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
                  </FieldRow>

                  <FieldRow
                    label="Default response time (hours)"
                    hint="Default response time."
                  >
                    <input
                      className="input"
                      type="number"
                      min="1"
                      max="72"
                      value={
                        formState.lendingDefaults.defaultResponseTimeHours
                      }
                      onChange={(event) =>
                        updateLendingField(
                          "defaultResponseTimeHours",
                          event.target.value,
                        )
                      }
                    />
                  </FieldRow>
                </SettingsSection>
              </div>
            ) : null}

            {activeTab === "workspace" ? (
              <div className="settings-tab-stack">
                <SettingsSection
                  title="Workspace Preferences"
                  subtitle="Startup and table defaults."
                >
                  <FieldRow
                    label="Default landing page"
                    hint="Start page."
                  >
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
                  </FieldRow>

                  <FieldRow
                    label="Default analytics range"
                    hint="Default analytics range."
                  >
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
                  </FieldRow>

                  <FieldRow
                    label="Pending requests page size"
                    hint="Rows per page."
                  >
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
                  </FieldRow>

                  <FieldRow
                    label="Borrower table page size"
                    hint="Rows per page."
                  >
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
                  </FieldRow>
                </SettingsSection>
              </div>
            ) : null}

            {activeTab === "account" ? (
              <div className="settings-tab-stack">
                <SettingsSection
                  title="Change Password"
                  subtitle="Use at least 8 characters."
                >
                  {passwordError ? (
                    <p className="create-ad-banner create-ad-banner--error settings-inline-banner">
                      <AlertTriangle size={14} /> {passwordError}
                    </p>
                  ) : null}
                  {passwordSuccess ? (
                    <p className="create-ad-banner settings-inline-banner">
                      <Check size={14} /> {passwordSuccess}
                    </p>
                  ) : null}

                  <FieldRow label="Current Password">
                    <div className="settings-password-field">
                      <input
                        className="input"
                        type={showCurrentPassword ? "text" : "password"}
                        placeholder="Enter current password"
                        value={passwordForm.current}
                        onKeyDown={handlePasswordFieldKeyDown}
                        onChange={(event) =>
                          setPasswordForm((current) => ({
                            ...current,
                            current: event.target.value,
                          }))
                        }
                      />
                      <button
                        type="button"
                        className="settings-password-toggle"
                        onClick={() =>
                          setShowCurrentPassword((current) => !current)
                        }
                        aria-label={
                          showCurrentPassword
                            ? "Hide current password"
                            : "Show current password"
                        }
                      >
                        {showCurrentPassword ? (
                          <EyeOff size={15} />
                        ) : (
                          <Eye size={15} />
                        )}
                      </button>
                    </div>
                  </FieldRow>

                  <FieldRow
                    label="New Password"
                    hint="Minimum 8 characters."
                  >
                    <div className="settings-password-field">
                      <input
                        className="input"
                        type={showNextPassword ? "text" : "password"}
                        placeholder="Enter new password"
                        value={passwordForm.next}
                        onKeyDown={handlePasswordFieldKeyDown}
                        onChange={(event) =>
                          setPasswordForm((current) => ({
                            ...current,
                            next: event.target.value,
                          }))
                        }
                      />
                      <button
                        type="button"
                        className="settings-password-toggle"
                        onClick={() =>
                          setShowNextPassword((current) => !current)
                        }
                        aria-label={
                          showNextPassword
                            ? "Hide new password"
                            : "Show new password"
                        }
                      >
                        {showNextPassword ? (
                          <EyeOff size={15} />
                        ) : (
                          <Eye size={15} />
                        )}
                      </button>
                    </div>
                  </FieldRow>

                  <FieldRow label="Confirm New Password">
                    <div className="settings-password-field">
                      <input
                        className="input"
                        type={showConfirmPassword ? "text" : "password"}
                        placeholder="Confirm new password"
                        value={passwordForm.confirm}
                        onKeyDown={handlePasswordFieldKeyDown}
                        onChange={(event) =>
                          setPasswordForm((current) => ({
                            ...current,
                            confirm: event.target.value,
                          }))
                        }
                      />
                      <button
                        type="button"
                        className="settings-password-toggle"
                        onClick={() =>
                          setShowConfirmPassword((current) => !current)
                        }
                        aria-label={
                          showConfirmPassword
                            ? "Hide confirmation password"
                            : "Show confirmation password"
                        }
                      >
                        {showConfirmPassword ? (
                          <EyeOff size={15} />
                        ) : (
                          <Eye size={15} />
                        )}
                      </button>
                    </div>
                  </FieldRow>

                  <div className="settings-password-actions">
                    <button
                      type="button"
                      className="create-ad-button create-ad-button--primary"
                      onClick={() => void handlePasswordChange()}
                      disabled={passwordSaving}
                    >
                      <Lock size={14} />{" "}
                      {passwordSaving ? "Updating..." : "Update Password"}
                    </button>
                  </div>
                </SettingsSection>

                <SettingsSection
                  title="Session And Access"
                  subtitle="Profile and session details."
                >
                  <div className="settings-session-list">
                    <div className="settings-session-item">
                      <span className="settings-session-item__label">
                        Display name
                      </span>
                      <strong>{session.displayName}</strong>
                    </div>
                    <div className="settings-session-item">
                      <span className="settings-session-item__label">Email</span>
                      <strong>
                        {session.email || "No email"}
                      </strong>
                    </div>
                  </div>

                  <p className="settings-side-note">
                    Edit business details in the profile editor.
                  </p>

                  <div className="settings-side-actions">
                    <button
                      type="button"
                      className="create-ad-button"
                      onClick={onOpenProfile}
                    >
                      <User size={15} /> Open Profile Editor
                    </button>
                    <button
                      type="button"
                      className="create-ad-button create-ad-button--ghost"
                      onClick={onLogout}
                    >
                      <LogOut size={15} /> Log Out
                    </button>
                  </div>
                </SettingsSection>
              </div>
            ) : null}

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
          </div>
        </section>
      </form>
    </section>
  );
}
