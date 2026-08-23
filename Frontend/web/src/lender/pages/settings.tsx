import { useEffect, useMemo, useState, type FormEvent } from "react";
import {
  BellRing,
  Check,
  CircleAlert,
  Clock3,
  LogOut,
  RefreshCw,
  ShieldCheck,
  Smartphone,
  UploadCloud,
  UserRound,
} from "lucide-react";
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
import {
  fetchMyKycSubmission,
  resubmitLenderKyc,
  type LenderKycSubmission,
} from "../lib/lender-kyc-api";

type SettingsPageProps = {
  session: LenderSession;
  onLogout: () => void;
  onOpenProfile: () => void;
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

function fileToDataUrl(file: File, imagesOnly = false): Promise<string> {
  const allowedTypes = imagesOnly
    ? ["image/jpeg", "image/png", "image/webp"]
    : ["image/jpeg", "image/png", "image/webp", "application/pdf"];

  if (!allowedTypes.includes(file.type)) {
    throw new Error(
      imagesOnly
        ? "The selfie must be a JPG, PNG, or WEBP image."
        : "KYC documents must be PDF, JPG, PNG, or WEBP files.",
    );
  }
  if (file.size > 10 * 1024 * 1024) {
    throw new Error("Each KYC file must be 10 MB or smaller.");
  }

  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () =>
      typeof reader.result === "string"
        ? resolve(reader.result)
        : reject(new Error("The selected file could not be read."));
    reader.onerror = () =>
      reject(new Error("The selected file could not be read."));
    reader.readAsDataURL(file);
  });
}

export default function SettingsPage({
  session,
  onLogout,
  onOpenProfile,
}: SettingsPageProps) {
  const [settings, setSettings] = useState<LenderSettings | null>(null);
  const [notifications, setNotifications] =
    useState<LenderSettingsNotifications | null>(null);
  const [profile, setProfile] = useState<LenderProfile | null>(null);
  const [kycSubmission, setKycSubmission] =
    useState<LenderKycSubmission | null>(null);
  const [kycFront, setKycFront] = useState<File | null>(null);
  const [kycBack, setKycBack] = useState<File | null>(null);
  const [kycSelfie, setKycSelfie] = useState<File | null>(null);
  const [isResubmittingKyc, setIsResubmittingKyc] = useState(false);
  const [kycError, setKycError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [profileWarning, setProfileWarning] = useState<string | null>(null);
  const [savedMessage, setSavedMessage] = useState<string | null>(null);

  async function loadPage() {
    setIsLoading(true);
    setError(null);
    setProfileWarning(null);

    const [settingsResult, profileResult, kycResult] = await Promise.allSettled(
      [
        fetchLenderSettings(session.lenderId),
        fetchLenderProfile(session.lenderId),
        fetchMyKycSubmission(),
      ],
    );

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

    if (kycResult.status === "fulfilled") {
      setKycSubmission(kycResult.value.submission);
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

  async function handleKycResubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setKycError(null);

    if (!kycFront || !kycBack) {
      setKycError("Select replacement files for both sides of your ID.");
      return;
    }

    try {
      setIsResubmittingKyc(true);
      const [documentFrontUrl, documentBackUrl, selfieUrl] = await Promise.all([
        fileToDataUrl(kycFront),
        fileToDataUrl(kycBack),
        kycSelfie ? fileToDataUrl(kycSelfie, true) : Promise.resolve(undefined),
      ]);
      const response = await resubmitLenderKyc({
        documentFrontUrl,
        documentBackUrl,
        ...(selfieUrl ? { selfieUrl } : {}),
      });
      setProfile((current) =>
        current ? { ...current, kycStatus: response.kycStatus } : current,
      );
      setKycSubmission((current) =>
        current ? { ...current, status: response.kycStatus } : current,
      );
      setKycFront(null);
      setKycBack(null);
      setKycSelfie(null);
      setSavedMessage("KYC documents resubmitted for admin review.");
    } catch (resubmitError) {
      setKycError(
        resubmitError instanceof Error
          ? resubmitError.message
          : "KYC resubmission failed.",
      );
    } finally {
      setIsResubmittingKyc(false);
    }
  }

  const displayName =
    profile?.businessName || profile?.fullName || session.displayName;
  const kycStatus = profile?.kycStatus || "unknown";

  return (
    <section className="dashboard-panel settings-workspace">
      <header className="page-header settings-workspace__header">
        <div>
          <h1 className="page-title">Settings</h1>
          <p className="page-subtitle">
            Manage notification preferences and account access.
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
            {kycStatus === "rejected" ? (
              <form
                className="settings-panel settings-kyc-resubmit"
                onSubmit={handleKycResubmit}
              >
                <div className="settings-panel__header">
                  <div>
                    <span className="settings-panel__eyebrow">
                      Verification required
                    </span>
                    <h2>Resubmit KYC</h2>
                    <p>Replace the rejected identity files for a new review.</p>
                  </div>
                  <ShieldCheck size={21} aria-hidden="true" />
                </div>

                {kycSubmission?.reviewNotes ? (
                  <div className="settings-kyc-review-note">
                    <CircleAlert size={17} aria-hidden="true" />
                    <div>
                      <strong>Admin review note</strong>
                      <p>{kycSubmission.reviewNotes}</p>
                    </div>
                  </div>
                ) : null}

                {kycError ? (
                  <div
                    className="settings-feedback settings-feedback--error settings-kyc-error"
                    role="alert"
                  >
                    <CircleAlert size={17} />
                    <span>{kycError}</span>
                  </div>
                ) : null}

                <div className="settings-kyc-fields">
                  <label>
                    <span>ID front</span>
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/webp,application/pdf"
                      required
                      disabled={isResubmittingKyc}
                      onChange={(event) =>
                        setKycFront(event.target.files?.[0] ?? null)
                      }
                    />
                    <small>
                      {kycFront?.name || "PDF or image, up to 10 MB"}
                    </small>
                  </label>
                  <label>
                    <span>ID back</span>
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/webp,application/pdf"
                      required
                      disabled={isResubmittingKyc}
                      onChange={(event) =>
                        setKycBack(event.target.files?.[0] ?? null)
                      }
                    />
                    <small>
                      {kycBack?.name || "PDF or image, up to 10 MB"}
                    </small>
                  </label>
                  <label>
                    <span>New selfie with ID (optional)</span>
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      disabled={isResubmittingKyc}
                      onChange={(event) =>
                        setKycSelfie(event.target.files?.[0] ?? null)
                      }
                    />
                    <small>{kycSelfie?.name || "JPG, PNG, or WEBP"}</small>
                  </label>
                </div>

                <div className="settings-kyc-actions">
                  <span>
                    New files are securely sent to the admin review queue.
                  </span>
                  <button
                    type="submit"
                    className="settings-primary-button"
                    disabled={isResubmittingKyc}
                  >
                    <UploadCloud size={17} />
                    {isResubmittingKyc ? "Submitting..." : "Resubmit KYC"}
                  </button>
                </div>
              </form>
            ) : null}

            <form className="settings-panel" onSubmit={handleSubmit}>
              <div className="settings-panel__header">
                <div>
                  <h2>Notifications</h2>
                  <p>
                    Control which important lender activities appear in your
                    notification inbox.
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
            <section className="settings-panel settings-account-card">
              <div className="settings-account-card__top">
                <div
                  className="settings-account-card__avatar"
                  aria-hidden="true"
                >
                  {displayName.trim().charAt(0).toUpperCase() || "L"}
                </div>
                <div className="settings-account-card__identity">
                  <span>Lender account</span>
                  <h2>{displayName}</h2>
                  <p>
                    {profile?.email || session.email || "Email not provided"}
                  </p>
                </div>
              </div>

              <div className="settings-account-card__security">
                <ShieldCheck size={18} aria-hidden="true" />
                <div>
                  <strong>
                    {kycStatus === "unknown"
                      ? "KYC status unavailable"
                      : `KYC ${titleCase(kycStatus)}`}
                  </strong>
                  <span>
                    <Clock3 size={13} aria-hidden="true" /> Profile updated{" "}
                    {formatDate(profile?.updatedAt)}
                  </span>
                </div>
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

            <section className="settings-panel settings-session-card">
              <div>
                <h2>Sign out</h2>
                <p>End the current lender session on this device.</p>
              </div>
              <button
                type="button"
                className="settings-logout-button"
                onClick={onLogout}
              >
                <LogOut size={17} />
                Log out
              </button>
            </section>
          </aside>
        </div>
      )}
    </section>
  );
}
