import { useMemo, useState } from "react";
import type { ChangeEvent, FormEvent } from "react";
import { useNavigate } from "react-router-dom";

import {
  LENDER_APP_URL,
  loginWithRole,
  registerPublicUser,
  submitKyc,
  type PublicSignupRole,
  type SubmitKycPayload,
} from "../../lib/api";
import {
  clearAdminSession,
  clearLenderSession,
  setAdminSession,
  setLenderSession,
  type SharedAuthUser,
} from "../../lib/auth";
import "./shared-auth.css";

type AuthMode = "login" | "register";
type RegisterStep = "account" | "kyc";
type UploadFieldKey = "documentFrontUrl" | "documentBackUrl" | "selfieUrl";
type SharedSession = {
  accessToken: string;
  user: SharedAuthUser;
};

const STORAGE_KEY = "smart-credit-shared-auth-session";

const initialKycForm: SubmitKycPayload = {
  documentType: "national_id",
  documentNumber: "",
  fullName: "",
  issuingCountry: "Sri Lanka",
  expiryDate: "",
  documentFrontUrl: "",
  documentBackUrl: "",
  selfieUrl: "",
};

const initialRegisterForm = {
  fullName: "",
  email: "",
  phone: "",
  password: "",
  confirmPassword: "",
  role: "lender" as PublicSignupRole,
  kyc: initialKycForm,
};

function loadStoredSession(): SharedSession | null {
  const rawValue = localStorage.getItem(STORAGE_KEY);

  if (!rawValue) {
    return null;
  }

  try {
    return JSON.parse(rawValue) as SharedSession;
  } catch {
    localStorage.removeItem(STORAGE_KEY);
    return null;
  }
}

function toDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () =>
      resolve(typeof reader.result === "string" ? reader.result : "");
    reader.onerror = () =>
      reject(new Error("We could not read the selected file."));
    reader.readAsDataURL(file);
  });
}

function getDocumentNumberLabel(documentType: string) {
  switch (documentType) {
    case "passport":
      return "Passport number";
    case "driving_license":
      return "License number";
    default:
      return "NIC number";
  }
}

type SharedAuthPageProps = {
  initialMode: AuthMode;
};

export default function SharedAuthPage({ initialMode }: SharedAuthPageProps) {
  const navigate = useNavigate();
  const [mode, setMode] = useState<AuthMode>(initialMode);
  const [registerStep, setRegisterStep] = useState<RegisterStep>("account");
  const [loginIdentifier, setLoginIdentifier] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [registerForm, setRegisterForm] = useState(initialRegisterForm);
  const [session, setSession] = useState<SharedSession | null>(() => loadStoredSession());
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [uploadStatus, setUploadStatus] = useState<Record<string, string>>({});
  const [apiError, setApiError] = useState("");
  const [infoMessage, setInfoMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const registerRoleLabel =
    registerForm.role === "borrower" ? "borrower" : "lender";

  const sessionSummary = useMemo(() => {
    if (!session) {
      return null;
    }

    return [
      { label: "Account", value: session.user.fullName },
      { label: "Email", value: session.user.email },
      { label: "Phone", value: session.user.phone || "Not provided" },
      { label: "Role", value: session.user.role },
      { label: "KYC Status", value: session.user.kycStatus || "pending" },
    ];
  }, [session]);

  function persistSharedSession(nextSession: SharedSession | null) {
    setSession(nextSession);

    if (!nextSession) {
      localStorage.removeItem(STORAGE_KEY);
      return;
    }

    localStorage.setItem(STORAGE_KEY, JSON.stringify(nextSession));
  }

  function resetMessages() {
    setApiError("");
    setInfoMessage("");
    setFieldErrors({});
  }

  function switchMode(nextMode: AuthMode) {
    resetMessages();
    setMode(nextMode);
    if (nextMode === "register") {
      setRegisterStep("account");
    }
  }

  function redirectToLender(nextSession: SharedSession) {
    clearAdminSession();
    setLenderSession(nextSession.accessToken, nextSession.user);

    const handoffUrl = new URL(LENDER_APP_URL, window.location.origin);
    handoffUrl.searchParams.set("accessToken", nextSession.accessToken);
    handoffUrl.searchParams.set("lenderId", nextSession.user.uid);
    handoffUrl.searchParams.set("displayName", nextSession.user.fullName);
    handoffUrl.searchParams.set("email", nextSession.user.email);
    window.location.assign(handoffUrl.toString());
  }

  function handleSuccessfulSession(nextSession: SharedSession, successCopy: string) {
    if (nextSession.user.role === "admin") {
      clearLenderSession();
      setAdminSession(nextSession.accessToken, nextSession.user);
      navigate("/admin/dashboard");
      return;
    }

    if (nextSession.user.role === "lender") {
      redirectToLender(nextSession);
      return;
    }

    clearAdminSession();
    clearLenderSession();
    persistSharedSession(nextSession);
    setInfoMessage(successCopy);
  }

  function validateLogin() {
    const nextErrors: Record<string, string> = {};

    if (!loginIdentifier.trim()) {
      nextErrors.identifier = "Email or phone is required.";
    }

    if (!loginPassword.trim()) {
      nextErrors.password = "Password is required.";
    }

    setFieldErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  }

  function validateRegisterAccount() {
    const nextErrors: Record<string, string> = {};

    if (!registerForm.fullName.trim()) {
      nextErrors.fullName = "Full name is required.";
    }

    if (!registerForm.email.trim()) {
      nextErrors.email = "Email is required.";
    } else if (!/^\S+@\S+\.\S+$/.test(registerForm.email.trim())) {
      nextErrors.email = "Enter a valid email address.";
    }

    if (!registerForm.phone.trim()) {
      nextErrors.phone = "Phone is required.";
    }

    if (!registerForm.password.trim()) {
      nextErrors.password = "Password is required.";
    } else if (registerForm.password.length < 8) {
      nextErrors.password = "Password must be at least 8 characters long.";
    }

    if (!registerForm.confirmPassword.trim()) {
      nextErrors.confirmPassword = "Please confirm your password.";
    } else if (registerForm.confirmPassword !== registerForm.password) {
      nextErrors.confirmPassword = "Passwords do not match.";
    }

    setFieldErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  }

  function validateKycDetails() {
    const nextErrors: Record<string, string> = {};

    if (!registerForm.kyc.fullName.trim()) {
      nextErrors.kycFullName = "Full name on the ID is required.";
    }

    if (!registerForm.kyc.documentNumber.trim()) {
      nextErrors.documentNumber = "Document number is required.";
    }

    if (!registerForm.kyc.documentFrontUrl?.trim()) {
      nextErrors.documentFrontUrl = "Upload the front of the ID.";
    }

    if (!registerForm.kyc.selfieUrl?.trim()) {
      nextErrors.selfieUrl = "Upload the selfie with your ID.";
    }

    setFieldErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  }

  function handleContinueToKyc() {
    resetMessages();

    if (!validateRegisterAccount()) {
      return;
    }

    setRegisterStep("kyc");
  }

  async function handleLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    resetMessages();

    if (!validateLogin()) {
      return;
    }

    try {
      setLoading(true);
      const response = await loginWithRole(loginIdentifier.trim(), loginPassword);
      handleSuccessfulSession(
        {
          accessToken: response.accessToken,
          user: response.user,
        },
        "Signed in successfully.",
      );
    } catch (error) {
      setApiError(error instanceof Error ? error.message : "Login failed.");
    } finally {
      setLoading(false);
    }
  }

  async function handleRegister(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    resetMessages();

    if (!validateRegisterAccount() || !validateKycDetails()) {
      return;
    }

    try {
      setLoading(true);

      await registerPublicUser({
        fullName: registerForm.fullName.trim(),
        email: registerForm.email.trim(),
        phone: registerForm.phone.trim(),
        password: registerForm.password,
        role: registerForm.role,
      });

      const authResponse = await loginWithRole(
        registerForm.email.trim(),
        registerForm.password,
        registerForm.role === "lender" ? "lender" : undefined,
      );

      await submitKyc(authResponse.accessToken, {
        documentType: registerForm.kyc.documentType,
        documentNumber: registerForm.kyc.documentNumber.trim(),
        fullName: registerForm.kyc.fullName.trim(),
        issuingCountry: registerForm.kyc.issuingCountry?.trim(),
        expiryDate: registerForm.kyc.expiryDate?.trim() || undefined,
        documentFrontUrl: registerForm.kyc.documentFrontUrl,
        documentBackUrl: registerForm.kyc.documentBackUrl || undefined,
        selfieUrl: registerForm.kyc.selfieUrl,
      });

      const nextSession: SharedSession = {
        accessToken: authResponse.accessToken,
        user: {
          ...authResponse.user,
          kycStatus: "pending",
        },
      };

      setRegisterForm(initialRegisterForm);
      setUploadStatus({});
      setRegisterStep("account");
      setLoginIdentifier(nextSession.user.email);
      setLoginPassword("");
      setMode("login");

      handleSuccessfulSession(
        nextSession,
        `Account created and KYC submitted successfully. Your ${registerRoleLabel} account is now waiting for review.`,
      );
    } catch (error) {
      setApiError(
        error instanceof Error
          ? error.message
          : "Registration failed. Please try again.",
      );
    } finally {
      setLoading(false);
    }
  }

  async function handleFileUpload(
    field: UploadFieldKey,
    event: ChangeEvent<HTMLInputElement>,
  ) {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    try {
      const dataUrl = await toDataUrl(file);
      setRegisterForm((current) => ({
        ...current,
        kyc: {
          ...current.kyc,
          [field]: dataUrl,
        },
      }));
      setUploadStatus((current) => ({
        ...current,
        [field]: file.name,
      }));
    } catch (error) {
      setApiError(
        error instanceof Error ? error.message : "File upload failed.",
      );
    } finally {
      event.target.value = "";
    }
  }

  function handleLogout() {
    clearAdminSession();
    clearLenderSession();
    persistSharedSession(null);
    setInfoMessage("Signed out successfully.");
  }

  return (
    <main className="shared-auth-page">
      <section className="shared-auth-hero">
        <div className="shared-auth-brand">
          <span className="shared-auth-brand-mark">SC</span>
          <div>
            <strong>Smart Credit+</strong>
            <p>Shared platform sign in</p>
          </div>
        </div>

        <div className="shared-auth-copy">
          <h1>
            One secure <span>login</span> for Smart Credit roles.
          </h1>
          <p>
            Sign in with your credentials and let the backend confirm the right
            access level for your account. Public signup stays available only for
            lenders and borrowers.
          </p>
        </div>

        <div className="shared-auth-stat-row">
          <div className="shared-auth-stat-card">
            <strong>Role based</strong>
            <span>Admin, lender, or borrower</span>
          </div>
          <div className="shared-auth-stat-card">
            <strong>Step 2 KYC</strong>
            <span>Separate onboarding review</span>
          </div>
        </div>
      </section>

      <section className="shared-auth-panel">
        <div className="shared-auth-shell">
          <div className="shared-auth-heading">
            <div className="shared-auth-kicker-row">
              <span className="shared-auth-kicker">
                {mode === "login" ? "Unified access" : "Guided onboarding"}
              </span>
              <span className="shared-auth-kicker shared-auth-kicker-muted">
                {mode === "login"
                  ? "Account session"
                  : `${registerRoleLabel} account setup`}
              </span>
            </div>
            <h2>
              {mode === "login"
                ? "Sign in"
                : `Create ${registerRoleLabel} account`}
            </h2>
            <p>
              {mode === "login"
                ? "Use your email or phone with your password. The backend resolves the account role after authentication."
                : `Register your ${registerRoleLabel} account and complete KYC in the same flow.`}
            </p>
          </div>

          <div className="shared-auth-mode-switch">
            <button
              type="button"
              className={mode === "login" ? "active" : ""}
              onClick={() => switchMode("login")}
            >
              Sign In
            </button>
            <button
              type="button"
              className={mode === "register" ? "active" : ""}
              onClick={() => switchMode("register")}
            >
              Create Account
            </button>
          </div>

          {(apiError || infoMessage) && (
            <div className={`shared-auth-banner ${apiError ? "error" : "success"}`}>
              {apiError || infoMessage}
            </div>
          )}

          {session ? (
            <section className="shared-auth-card">
              <div className="shared-auth-success-pill">Signed in</div>
              <h3>{session.user.fullName}</h3>
              <p className="shared-auth-success-copy">
                Your shared authentication flow is connected successfully.
              </p>
              <div className="shared-auth-session-summary">
                {sessionSummary?.map((item) => (
                  <div key={item.label} className="shared-auth-session-row">
                    <span>{item.label}</span>
                    <strong>{item.value}</strong>
                  </div>
                ))}
              </div>
              <button type="button" className="shared-auth-primary" onClick={handleLogout}>
                Sign Out
              </button>
            </section>
          ) : mode === "login" ? (
            <form className="shared-auth-card shared-auth-form" onSubmit={handleLogin}>
              <div className="shared-auth-field-card">
                <div className="shared-auth-section-head">
                  <strong>Sign in</strong>
                  <span>Enter the credentials stored for your Smart Credit account.</span>
                </div>

                <div className="shared-auth-note-box">
                  <strong>Backend-resolved access</strong>
                  <span>
                    Your session is issued with the role stored on the backend, so the login form stays focused on identity and password only.
                  </span>
                </div>
              </div>

              <div className="shared-auth-field-card shared-auth-field-card-soft">
                <label className="shared-auth-field">
                  <span>Email or phone</span>
                  <input
                    value={loginIdentifier}
                    onChange={(event) => setLoginIdentifier(event.target.value)}
                    placeholder="name@example.com or +94 77 123 4567"
                    disabled={loading}
                  />
                  {fieldErrors.identifier ? (
                    <small className="shared-auth-error-text">{fieldErrors.identifier}</small>
                  ) : null}
                </label>

                <label className="shared-auth-field">
                  <span>Password</span>
                  <input
                    type="password"
                    value={loginPassword}
                    onChange={(event) => setLoginPassword(event.target.value)}
                    placeholder="Enter your password"
                    disabled={loading}
                  />
                  {fieldErrors.password ? (
                    <small className="shared-auth-error-text">{fieldErrors.password}</small>
                  ) : null}
                </label>
              </div>

              <div className="shared-auth-inline-note">
                <span className="shared-auth-inline-dot" />
                <p>
                  The backend validates your credentials and signs the session with the role assigned to your account.
                </p>
              </div>

              <button type="submit" className="shared-auth-primary" disabled={loading}>
                {loading ? "Signing in..." : "Sign In"}
              </button>
            </form>
          ) : (
            <form className="shared-auth-card shared-auth-form" onSubmit={handleRegister}>
              <div className="shared-auth-onboarding-strip">
                <div className={`shared-auth-onboarding-step ${registerStep === "account" ? "active" : "complete"}`}>
                  <span>1</span>
                  <div>
                    <strong>Account</strong>
                    <p>Create sign-in credentials.</p>
                  </div>
                </div>
                <div className={`shared-auth-onboarding-step ${registerStep === "kyc" ? "active" : ""}`}>
                  <span>2</span>
                  <div>
                    <strong>KYC</strong>
                    <p>Submit identity evidence.</p>
                  </div>
                </div>
              </div>

              <div className="shared-auth-field-card">
                <label className="shared-auth-field">
                  <span>Create account for</span>
                  <div className="shared-auth-role-chip-row">
                    {(["lender", "borrower"] as PublicSignupRole[]).map((role) => (
                      <button
                        key={role}
                        type="button"
                        className={`shared-auth-role-chip ${registerForm.role === role ? "active" : ""}`}
                        onClick={() =>
                          setRegisterForm((current) => ({
                            ...current,
                            role,
                          }))
                        }
                      >
                        {role.charAt(0).toUpperCase() + role.slice(1)}
                      </button>
                    ))}
                  </div>
                </label>
              </div>

              {registerStep === "account" ? (
                <>
                  <div className="shared-auth-field-card">
                    <div className="shared-auth-section-head">
                      <strong>Account details</strong>
                      <span>Use the contact details and password you will sign in with later.</span>
                    </div>

                    <div className="shared-auth-grid two-column">
                      <label className="shared-auth-field">
                        <span>Full name</span>
                        <input
                          value={registerForm.fullName}
                          onChange={(event) =>
                            setRegisterForm((current) => ({
                              ...current,
                              fullName: event.target.value,
                              kyc: {
                                ...current.kyc,
                                fullName: current.kyc.fullName || event.target.value,
                              },
                            }))
                          }
                          placeholder="Nadeesha Perera"
                          disabled={loading}
                        />
                        {fieldErrors.fullName ? (
                          <small className="shared-auth-error-text">{fieldErrors.fullName}</small>
                        ) : null}
                      </label>

                      <label className="shared-auth-field">
                        <span>Phone</span>
                        <input
                          value={registerForm.phone}
                          onChange={(event) =>
                            setRegisterForm((current) => ({
                              ...current,
                              phone: event.target.value,
                            }))
                          }
                          placeholder="+94 77 123 4567"
                          disabled={loading}
                        />
                        {fieldErrors.phone ? (
                          <small className="shared-auth-error-text">{fieldErrors.phone}</small>
                        ) : null}
                      </label>
                    </div>

                    <label className="shared-auth-field">
                      <span>Email</span>
                      <input
                        type="email"
                        value={registerForm.email}
                        onChange={(event) =>
                          setRegisterForm((current) => ({
                            ...current,
                            email: event.target.value,
                          }))
                        }
                        placeholder={`${registerRoleLabel}@example.com`}
                        disabled={loading}
                      />
                      {fieldErrors.email ? (
                        <small className="shared-auth-error-text">{fieldErrors.email}</small>
                      ) : null}
                    </label>

                    <div className="shared-auth-grid two-column">
                      <label className="shared-auth-field">
                        <span>Password</span>
                        <input
                          type="password"
                          value={registerForm.password}
                          onChange={(event) =>
                            setRegisterForm((current) => ({
                              ...current,
                              password: event.target.value,
                            }))
                          }
                          placeholder="Minimum 8 characters"
                          disabled={loading}
                        />
                        {fieldErrors.password ? (
                          <small className="shared-auth-error-text">{fieldErrors.password}</small>
                        ) : null}
                      </label>

                      <label className="shared-auth-field">
                        <span>Confirm password</span>
                        <input
                          type="password"
                          value={registerForm.confirmPassword}
                          onChange={(event) =>
                            setRegisterForm((current) => ({
                              ...current,
                              confirmPassword: event.target.value,
                            }))
                          }
                          placeholder="Re-enter password"
                          disabled={loading}
                        />
                        {fieldErrors.confirmPassword ? (
                          <small className="shared-auth-error-text">{fieldErrors.confirmPassword}</small>
                        ) : null}
                      </label>
                    </div>
                  </div>

                  <button
                    type="button"
                    className="shared-auth-primary"
                    onClick={handleContinueToKyc}
                    disabled={loading}
                  >
                    Continue to KYC
                  </button>
                </>
              ) : (
                <>
                  <div className="shared-auth-section-divider">
                    <strong>KYC verification</strong>
                    <span>
                      Submit your identity details on this separate step so your {registerRoleLabel} account can be reviewed immediately.
                    </span>
                  </div>

                  <div className="shared-auth-field-card">
                    <div className="shared-auth-section-head">
                      <strong>Identity details</strong>
                      <span>Make sure the name and number exactly match the selected ID.</span>
                    </div>

                    <label className="shared-auth-field">
                      <span>Full name on ID</span>
                      <input
                        value={registerForm.kyc.fullName}
                        onChange={(event) =>
                          setRegisterForm((current) => ({
                            ...current,
                            kyc: {
                              ...current.kyc,
                              fullName: event.target.value,
                            },
                          }))
                        }
                        placeholder="Name as on NIC"
                        disabled={loading}
                      />
                      {fieldErrors.kycFullName ? (
                        <small className="shared-auth-error-text">{fieldErrors.kycFullName}</small>
                      ) : null}
                    </label>

                    <div className="shared-auth-grid two-column">
                      <label className="shared-auth-field">
                        <span>Document type</span>
                        <select
                          value={registerForm.kyc.documentType}
                          onChange={(event) =>
                            setRegisterForm((current) => ({
                              ...current,
                              kyc: {
                                ...current.kyc,
                                documentType: event.target.value,
                              },
                            }))
                          }
                          disabled={loading}
                        >
                          <option value="national_id">National ID</option>
                          <option value="passport">Passport</option>
                          <option value="driving_license">Driving License</option>
                        </select>
                      </label>

                      <label className="shared-auth-field">
                        <span>{getDocumentNumberLabel(registerForm.kyc.documentType)}</span>
                        <input
                          value={registerForm.kyc.documentNumber}
                          onChange={(event) =>
                            setRegisterForm((current) => ({
                              ...current,
                              kyc: {
                                ...current.kyc,
                                documentNumber: event.target.value,
                              },
                            }))
                          }
                          placeholder="Enter the number on your ID"
                          disabled={loading}
                        />
                        {fieldErrors.documentNumber ? (
                          <small className="shared-auth-error-text">{fieldErrors.documentNumber}</small>
                        ) : null}
                      </label>
                    </div>

                    <div className="shared-auth-grid two-column">
                      <label className="shared-auth-field">
                        <span>Issuing country</span>
                        <input
                          value={registerForm.kyc.issuingCountry ?? ""}
                          onChange={(event) =>
                            setRegisterForm((current) => ({
                              ...current,
                              kyc: {
                                ...current.kyc,
                                issuingCountry: event.target.value,
                              },
                            }))
                          }
                          placeholder="Sri Lanka"
                          disabled={loading}
                        />
                      </label>

                      <label className="shared-auth-field">
                        <span>Expiry date</span>
                        <input
                          type="date"
                          value={registerForm.kyc.expiryDate ?? ""}
                          onChange={(event) =>
                            setRegisterForm((current) => ({
                              ...current,
                              kyc: {
                                ...current.kyc,
                                expiryDate: event.target.value,
                              },
                            }))
                          }
                          disabled={loading}
                        />
                      </label>
                    </div>
                  </div>

                  <div className="shared-auth-field-card">
                    <div className="shared-auth-section-head">
                      <strong>Upload files</strong>
                      <span>Upload clear files for your ID front, optional back, and selfie with the ID.</span>
                    </div>

                    <div className="shared-auth-grid two-column">
                      <label className="shared-auth-field">
                        <span>ID front</span>
                        <input
                          type="file"
                          accept="image/*,.pdf"
                          onChange={(event) => void handleFileUpload("documentFrontUrl", event)}
                          disabled={loading}
                        />
                        {uploadStatus.documentFrontUrl ? (
                          <small className="shared-auth-success-text">
                            Uploaded: {uploadStatus.documentFrontUrl}
                          </small>
                        ) : null}
                        {fieldErrors.documentFrontUrl ? (
                          <small className="shared-auth-error-text">{fieldErrors.documentFrontUrl}</small>
                        ) : null}
                      </label>

                      <label className="shared-auth-field">
                        <span>ID back</span>
                        <input
                          type="file"
                          accept="image/*,.pdf"
                          onChange={(event) => void handleFileUpload("documentBackUrl", event)}
                          disabled={loading}
                        />
                        {uploadStatus.documentBackUrl ? (
                          <small className="shared-auth-success-text">
                            Uploaded: {uploadStatus.documentBackUrl}
                          </small>
                        ) : null}
                      </label>
                    </div>

                    <label className="shared-auth-field">
                      <span>Selfie with ID</span>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(event) => void handleFileUpload("selfieUrl", event)}
                        disabled={loading}
                      />
                      {uploadStatus.selfieUrl ? (
                        <small className="shared-auth-success-text">
                          Uploaded: {uploadStatus.selfieUrl}
                        </small>
                      ) : null}
                      {fieldErrors.selfieUrl ? (
                        <small className="shared-auth-error-text">{fieldErrors.selfieUrl}</small>
                      ) : null}
                    </label>
                  </div>

                  <div className="shared-auth-action-row">
                    <button
                      type="button"
                      className="shared-auth-secondary"
                      onClick={() => setRegisterStep("account")}
                      disabled={loading}
                    >
                      Back
                    </button>
                    <button type="submit" className="shared-auth-primary" disabled={loading}>
                      {loading ? "Creating account..." : "Create Account"}
                    </button>
                  </div>
                </>
              )}
            </form>
          )}
        </div>
      </section>
    </main>
  );
}
