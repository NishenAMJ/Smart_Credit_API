import { useMemo, useState } from "react";
import type { ChangeEvent, FormEvent } from "react";
import { useNavigate } from "react-router-dom";

import {
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
type LoginRole = SharedAuthUser["role"];
type SelectableRole = Exclude<LoginRole, "admin">;

const ROLE_DETAILS: Record<
  SelectableRole,
  { label: string; description: string; destination: string }
> = {
  lender: {
    label: "Lender",
    description: "Manage loans, borrowers, collections, ads, and payments.",
    destination: "Lender workspace",
  },
  borrower: {
    label: "Borrower",
    description: "Continue with your borrower account and mobile experience.",
    destination: "Borrower session",
  },
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

// Restores the last auth session from local storage when the admin returns to the app.
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

// Converts an uploaded file into a data URL for preview and submission flows.
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

// Maps document type to the label shown in the KYC form.
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

// Handles the shared sign-in and sign-up flow for admin, lender, and borrower auth.
export default function SharedAuthPage({ initialMode }: SharedAuthPageProps) {
  const navigate = useNavigate();
  const [mode, setMode] = useState<AuthMode>(initialMode);
  const [registerStep, setRegisterStep] = useState<RegisterStep>("account");
  const [loginIdentifier, setLoginIdentifier] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [showLoginPassword, setShowLoginPassword] = useState(false);
  const [showRegisterPasswords, setShowRegisterPasswords] = useState(false);
  const [registerForm, setRegisterForm] = useState(initialRegisterForm);
  const [session, setSession] = useState<SharedSession | null>(() =>
    loadStoredSession(),
  );
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [uploadStatus, setUploadStatus] = useState<Record<string, string>>({});
  const [apiError, setApiError] = useState("");
  const [infoMessage, setInfoMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [roleOptions, setRoleOptions] = useState<SelectableRole[]>([]);

  const registerRoleLabel = "lender";

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
    setRoleOptions([]);
    setShowLoginPassword(false);
    setShowRegisterPasswords(false);
    setMode(nextMode);
    if (nextMode === "register") {
      setRegisterStep("account");
    }
  }

  function redirectToLender(nextSession: SharedSession) {
    clearAdminSession();
    setLenderSession(nextSession.accessToken, nextSession.user);
    navigate("/lender", { replace: true });
  }

  function handleSuccessfulSession(
    nextSession: SharedSession,
    successCopy: string,
  ) {
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

    if (!registerForm.kyc.documentBackUrl?.trim()) {
      nextErrors.documentBackUrl = "Upload the back of the ID.";
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
      const response = await loginWithRole(
        loginIdentifier.trim(),
        loginPassword,
      );

      const availableRoles = Array.from(
        new Set(
          response.availableRoles?.length
            ? response.availableRoles
            : [response.user.role],
        ),
      );
      const selectableRoles = availableRoles.filter(
        (role): role is SelectableRole =>
          role === "borrower" || role === "lender",
      );

      if (!availableRoles.includes("admin") && selectableRoles.length > 1) {
        setRoleOptions(selectableRoles);
        return;
      }

      setLoginPassword("");
      handleSuccessfulSession(
        {
          accessToken: response.accessToken,
          user: response.user,
        },
        "Logged in successfully.",
      );
    } catch (error) {
      setApiError(error instanceof Error ? error.message : "Log in failed.");
    } finally {
      setLoading(false);
    }
  }

  async function handleRoleSelection(role: SelectableRole) {
    resetMessages();

    try {
      setLoading(true);
      const response = await loginWithRole(
        loginIdentifier.trim(),
        loginPassword,
        role,
      );

      setRoleOptions([]);
      setLoginPassword("");
      handleSuccessfulSession(
        {
          accessToken: response.accessToken,
          user: response.user,
        },
        role === "borrower"
          ? "Logged in as a borrower. Continue in the Smart Credit mobile app for the borrower workspace."
          : `Signed in as ${ROLE_DETAILS[role].label.toLowerCase()}.`,
      );
    } catch (error) {
      setApiError(
        error instanceof Error ? error.message : "Role selection failed.",
      );
    } finally {
      setLoading(false);
    }
  }

  function cancelRoleSelection() {
    setRoleOptions([]);
    setLoginPassword("");
    setInfoMessage(
      "Role selection cancelled. Enter your password to log in again.",
    );
  }

  async function handleRegister(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    resetMessages();

    if (!validateRegisterAccount() || !validateKycDetails()) {
      return;
    }

    try {
      setLoading(true);
      let resumingExistingAccount = false;

      try {
        await registerPublicUser({
          fullName: registerForm.fullName.trim(),
          email: registerForm.email.trim(),
          phone: registerForm.phone.trim(),
          password: registerForm.password,
          role: "lender",
        });
      } catch (registerError) {
        const message =
          registerError instanceof Error ? registerError.message : "";
        if (
          !message
            .toLowerCase()
            .includes("account with that email already exists")
        ) {
          throw registerError;
        }

        resumingExistingAccount = true;
      }

      let authResponse: Awaited<ReturnType<typeof loginWithRole>>;
      try {
        authResponse = await loginWithRole(
          registerForm.email.trim(),
          registerForm.password,
          "lender",
        );
      } catch (loginError) {
        if (resumingExistingAccount) {
          throw new Error(
            "An account already exists with this email. Enter the original password to resume KYC submission, or return to Log In.",
          );
        }

        throw loginError;
      }

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
    setInfoMessage("Logged out successfully.");
  }

  return (
    <main className="shared-auth-page">
      <div className="shared-auth-layout">
        <section className="shared-auth-hero">
          <div className="shared-auth-brand">
            <span className="shared-auth-brand-mark">SC</span>
            <div>
              <strong>Smart Credit+</strong>
              <p>Secure platform access</p>
            </div>
          </div>

          <div className="shared-auth-copy">
            <h1>
              One secure account for every <span>Smart Credit</span> role.
            </h1>
            <p>
              Log in with your credentials and continue to the workspace
              assigned to your account. New lenders can sign up and complete KYC
              here.
            </p>
          </div>

          <div className="shared-auth-stat-row">
            <div className="shared-auth-stat-card">
              <strong>Role based</strong>
              <span>Access for every account role</span>
            </div>
            <div className="shared-auth-stat-card">
              <strong>Step 2 KYC</strong>
              <span>Separate onboarding review</span>
            </div>
          </div>
        </section>

        <section className="shared-auth-panel">
          <div className="shared-auth-shell">
            <div className="shared-auth-mobile-brand">
              <span className="shared-auth-brand-mark">SC</span>
              <div>
                <strong>Smart Credit+</strong>
                <p>Secure platform access</p>
              </div>
            </div>

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
                  ? "Log in"
                  : `Sign up as a ${registerRoleLabel}`}
              </h2>
              <p>
                {mode === "login"
                  ? "Enter your email or phone and password to continue."
                  : `Create your ${registerRoleLabel} account and complete KYC in the same flow.`}
              </p>
            </div>

            <div className="shared-auth-mode-switch">
              <button
                type="button"
                className={mode === "login" ? "active" : ""}
                onClick={() => switchMode("login")}
              >
                Log In
              </button>
              <button
                type="button"
                className={mode === "register" ? "active" : ""}
                onClick={() => switchMode("register")}
              >
                Sign Up
              </button>
            </div>

            {(apiError || infoMessage) && (
              <div
                className={`shared-auth-banner ${apiError ? "error" : "success"}`}
              >
                {apiError || infoMessage}
              </div>
            )}

            {session ? (
              <section className="shared-auth-card">
                <div className="shared-auth-success-pill">Logged in</div>
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
                <button
                  type="button"
                  className="shared-auth-primary"
                  onClick={handleLogout}
                >
                  Log Out
                </button>
              </section>
            ) : mode === "login" ? (
              <form
                className="shared-auth-card shared-auth-form"
                onSubmit={handleLogin}
              >
                <div className="shared-auth-field-card shared-auth-field-card-soft">
                  <label className="shared-auth-field">
                    <span>Email or phone</span>
                    <input
                      value={loginIdentifier}
                      onChange={(event) =>
                        setLoginIdentifier(event.target.value)
                      }
                      placeholder="name@example.com or +94 77 123 4567"
                      disabled={loading}
                    />
                    {fieldErrors.identifier ? (
                      <small className="shared-auth-error-text">
                        {fieldErrors.identifier}
                      </small>
                    ) : null}
                  </label>

                  <label className="shared-auth-field">
                    <span>Password</span>
                    <div className="shared-auth-password-control">
                      <input
                        type={showLoginPassword ? "text" : "password"}
                        value={loginPassword}
                        onChange={(event) =>
                          setLoginPassword(event.target.value)
                        }
                        placeholder="Enter your password"
                        disabled={loading}
                      />
                      <button
                        type="button"
                        onClick={() =>
                          setShowLoginPassword((current) => !current)
                        }
                        aria-label={
                          showLoginPassword ? "Hide password" : "Show password"
                        }
                        aria-pressed={showLoginPassword}
                        disabled={loading}
                      >
                        {showLoginPassword ? "Hide" : "Show"}
                      </button>
                    </div>
                    {fieldErrors.password ? (
                      <small className="shared-auth-error-text">
                        {fieldErrors.password}
                      </small>
                    ) : null}
                  </label>
                </div>

                <button
                  type="submit"
                  className="shared-auth-primary"
                  disabled={loading}
                >
                  {loading ? "Logging in..." : "Log In"}
                </button>
              </form>
            ) : (
              <form
                className="shared-auth-card shared-auth-form"
                onSubmit={handleRegister}
              >
                <div className="shared-auth-onboarding-strip">
                  <div
                    className={`shared-auth-onboarding-step ${registerStep === "account" ? "active" : "complete"}`}
                  >
                    <span>1</span>
                    <div>
                      <strong>Account</strong>
                      <p>Create your account credentials.</p>
                    </div>
                  </div>
                  <div
                    className={`shared-auth-onboarding-step ${registerStep === "kyc" ? "active" : ""}`}
                  >
                    <span>2</span>
                    <div>
                      <strong>KYC</strong>
                      <p>Submit identity evidence.</p>
                    </div>
                  </div>
                </div>

                {registerStep === "account" ? (
                  <>
                    <div className="shared-auth-field-card">
                      <div className="shared-auth-section-head">
                        <strong>Account details</strong>
                        <span>
                          Use the contact details and password you will sign in
                          with later.
                        </span>
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
                                  fullName:
                                    current.kyc.fullName || event.target.value,
                                },
                              }))
                            }
                            placeholder="Nadeesha Perera"
                            disabled={loading}
                          />
                          {fieldErrors.fullName ? (
                            <small className="shared-auth-error-text">
                              {fieldErrors.fullName}
                            </small>
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
                            <small className="shared-auth-error-text">
                              {fieldErrors.phone}
                            </small>
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
                          <small className="shared-auth-error-text">
                            {fieldErrors.email}
                          </small>
                        ) : null}
                      </label>

                      <div className="shared-auth-grid two-column">
                        <label className="shared-auth-field">
                          <span>Password</span>
                          <div className="shared-auth-password-control">
                            <input
                              type={showRegisterPasswords ? "text" : "password"}
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
                            <button
                              type="button"
                              onClick={() =>
                                setShowRegisterPasswords((current) => !current)
                              }
                              aria-label={
                                showRegisterPasswords
                                  ? "Hide passwords"
                                  : "Show passwords"
                              }
                              aria-pressed={showRegisterPasswords}
                              disabled={loading}
                            >
                              {showRegisterPasswords ? "Hide" : "Show"}
                            </button>
                          </div>
                          {fieldErrors.password ? (
                            <small className="shared-auth-error-text">
                              {fieldErrors.password}
                            </small>
                          ) : null}
                        </label>

                        <label className="shared-auth-field">
                          <span>Confirm password</span>
                          <input
                            type={showRegisterPasswords ? "text" : "password"}
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
                            <small className="shared-auth-error-text">
                              {fieldErrors.confirmPassword}
                            </small>
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
                        Submit your identity details on this separate step so
                        your {registerRoleLabel} account can be reviewed
                        immediately.
                      </span>
                    </div>

                    <div className="shared-auth-field-card">
                      <div className="shared-auth-section-head">
                        <strong>Identity details</strong>
                        <span>
                          Make sure the name and number exactly match the
                          selected ID.
                        </span>
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
                          <small className="shared-auth-error-text">
                            {fieldErrors.kycFullName}
                          </small>
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
                            <option value="driving_license">
                              Driving License
                            </option>
                          </select>
                        </label>

                        <label className="shared-auth-field">
                          <span>
                            {getDocumentNumberLabel(
                              registerForm.kyc.documentType,
                            )}
                          </span>
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
                            <small className="shared-auth-error-text">
                              {fieldErrors.documentNumber}
                            </small>
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
                        <span>
                          Upload clear files for your ID front, ID back, and
                          selfie with the ID.
                        </span>
                      </div>

                      <div className="shared-auth-grid two-column">
                        <label className="shared-auth-field">
                          <span>ID front</span>
                          <input
                            type="file"
                            accept="image/*,.pdf"
                            onChange={(event) =>
                              void handleFileUpload("documentFrontUrl", event)
                            }
                            disabled={loading}
                          />
                          {uploadStatus.documentFrontUrl ? (
                            <small className="shared-auth-success-text">
                              Uploaded: {uploadStatus.documentFrontUrl}
                            </small>
                          ) : null}
                          {fieldErrors.documentFrontUrl ? (
                            <small className="shared-auth-error-text">
                              {fieldErrors.documentFrontUrl}
                            </small>
                          ) : null}
                        </label>

                        <label className="shared-auth-field">
                          <span>ID back</span>
                          <input
                            type="file"
                            accept="image/*,.pdf"
                            onChange={(event) =>
                              void handleFileUpload("documentBackUrl", event)
                            }
                            disabled={loading}
                          />
                          {uploadStatus.documentBackUrl ? (
                            <small className="shared-auth-success-text">
                              Uploaded: {uploadStatus.documentBackUrl}
                            </small>
                          ) : null}
                          {fieldErrors.documentBackUrl ? (
                            <small className="shared-auth-error-text">
                              {fieldErrors.documentBackUrl}
                            </small>
                          ) : null}
                        </label>
                      </div>

                      <label className="shared-auth-field">
                        <span>Selfie with ID</span>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={(event) =>
                            void handleFileUpload("selfieUrl", event)
                          }
                          disabled={loading}
                        />
                        {uploadStatus.selfieUrl ? (
                          <small className="shared-auth-success-text">
                            Uploaded: {uploadStatus.selfieUrl}
                          </small>
                        ) : null}
                        {fieldErrors.selfieUrl ? (
                          <small className="shared-auth-error-text">
                            {fieldErrors.selfieUrl}
                          </small>
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
                      <button
                        type="submit"
                        className="shared-auth-primary"
                        disabled={loading}
                      >
                        {loading ? "Creating account..." : "Complete Sign Up"}
                      </button>
                    </div>
                  </>
                )}
              </form>
            )}
          </div>
        </section>
      </div>

      {roleOptions.length > 1 ? (
        <div
          className="shared-auth-role-modal-backdrop"
          role="presentation"
          onMouseDown={(event) => {
            if (event.currentTarget === event.target && !loading) {
              cancelRoleSelection();
            }
          }}
        >
          <section
            className="shared-auth-role-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="role-selection-title"
          >
            <div className="shared-auth-role-modal-heading">
              <span className="shared-auth-kicker">
                Multiple roles detected
              </span>
              <h2 id="role-selection-title">How would you like to continue?</h2>
              <p>
                This account has more than one role. Choose the workspace for
                this session. You can sign out and choose another role later.
              </p>
            </div>

            <div className="shared-auth-role-options">
              {roleOptions.map((role) => {
                const details = ROLE_DETAILS[role];

                return (
                  <button
                    type="button"
                    className="shared-auth-role-option"
                    key={role}
                    onClick={() => void handleRoleSelection(role)}
                    disabled={loading}
                  >
                    <span
                      className="shared-auth-role-option-icon"
                      aria-hidden="true"
                    >
                      {details.label.slice(0, 1)}
                    </span>
                    <span className="shared-auth-role-option-copy">
                      <strong>Continue as {details.label}</strong>
                      <small>{details.description}</small>
                      <em>{details.destination}</em>
                    </span>
                    <span
                      className="shared-auth-role-option-arrow"
                      aria-hidden="true"
                    >
                      →
                    </span>
                  </button>
                );
              })}
            </div>

            <button
              type="button"
              className="shared-auth-role-cancel"
              onClick={cancelRoleSelection}
              disabled={loading}
            >
              {loading ? "Opening workspace..." : "Cancel"}
            </button>
          </section>
        </div>
      ) : null}
    </main>
  );
}
