import { useMemo, useState, type ChangeEvent, type FormEvent } from "react";
import type { LenderSession } from "../lib/lender-session";
import {
  login,
  register,
  submitKyc,
  type SubmitKycPayload,
} from "../lib/auth-api";

type AuthMode = "login" | "signup";
type RegisterStep = "account" | "kyc";
type UploadFieldKey =
  | "documentFrontUrl"
  | "documentBackUrl"
  | "selfieUrl"
  | "profilePictureUrl";

type AuthPageProps = {
  onLogin: (session: LenderSession) => void;
};

type SignUpForm = {
  fullName: string;
  email: string;
  phone: string;
  password: string;
  confirmPassword: string;
  acceptedTerms: boolean;
  kyc: SubmitKycPayload;
};

const initialSignUpForm: SignUpForm = {
  fullName: "",
  email: "",
  phone: "",
  password: "",
  confirmPassword: "",
  acceptedTerms: false,
  kyc: {
    documentType: "national_id",
    documentNumber: "",
    fullName: "",
    issuingCountry: "Sri Lanka",
    expiryDate: "",
    documentFrontUrl: "",
    documentBackUrl: "",
    selfieUrl: "",
    profilePictureUrl: "",
  },
};

function getDocumentLabel(documentType: string) {
  switch (documentType) {
    case "passport":
      return "Passport";
    case "driving_license":
      return "License";
    default:
      return "NIC";
  }
}

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () =>
      resolve(typeof reader.result === "string" ? reader.result : "");
    reader.onerror = () =>
      reject(new Error("Failed to read the selected file."));
    reader.readAsDataURL(file);
  });
}

export default function AuthPage({ onLogin }: AuthPageProps) {
  const [activeMode, setActiveMode] = useState<AuthMode>("login");
  const [registerStep, setRegisterStep] = useState<RegisterStep>("account");
  const [loginIdentifier, setLoginIdentifier] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [signUpForm, setSignUpForm] = useState<SignUpForm>(initialSignUpForm);
  const [uploadStatus, setUploadStatus] = useState<
    Partial<Record<UploadFieldKey, string>>
  >({});
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const documentLabel = getDocumentLabel(signUpForm.kyc.documentType);
  const documentNumberLabel =
    signUpForm.kyc.documentType === "passport"
      ? "Passport number"
      : signUpForm.kyc.documentType === "driving_license"
        ? "License number"
        : "NIC number";

  const authCopy = useMemo(() => {
    return activeMode === "login"
      ? {
          eyebrow: "Lender",
          title: "Sign in",
          subtitle: "Enter your email or phone number to continue.",
          buttonLabel: "Sign in",
        }
      : {
          eyebrow: "Lender",
          title:
            registerStep === "account"
              ? "Create account"
              : "Verify account",
          subtitle:
            registerStep === "account"
              ? "Enter your account details."
              : "Add your identity details and files.",
          buttonLabel:
            registerStep === "account" ? "Continue to KYC" : "Create account",
        };
  }, [activeMode, registerStep]);

  function resetAuthMode(nextMode: AuthMode) {
    setActiveMode(nextMode);
    setError(null);

    if (nextMode === "signup") {
      setRegisterStep("account");
    }
  }

  function validateAccountStep() {
    if (!signUpForm.fullName.trim()) {
      setError("Full name is required.");
      return false;
    }

    if (
      !signUpForm.email.trim() ||
      !/\S+@\S+\.\S+/.test(signUpForm.email.trim())
    ) {
      setError("Enter a valid email address.");
      return false;
    }

    if (!signUpForm.phone.trim()) {
      setError("Phone number is required.");
      return false;
    }

    if (signUpForm.password.length < 8) {
      setError("Password must be at least 8 characters long.");
      return false;
    }

    if (signUpForm.password !== signUpForm.confirmPassword) {
      setError("Passwords do not match.");
      return false;
    }

    return true;
  }

  function validateKycStep() {
    if (
      !signUpForm.kyc.documentNumber.trim() ||
      !signUpForm.kyc.fullName.trim()
    ) {
      setError(`Full name on the ID and ${documentLabel} number are required.`);
      return false;
    }

    if (
      !signUpForm.kyc.documentFrontUrl?.trim() ||
      !signUpForm.kyc.selfieUrl?.trim()
    ) {
      setError(
        `${documentLabel} front file and selfie file are required for KYC.`,
      );
      return false;
    }

    if (!signUpForm.kyc.profilePictureUrl?.trim()) {
      setError("Profile picture is required.");
      return false;
    }

    if (!signUpForm.acceptedTerms) {
      setError("Accept the terms before creating your account.");
      return false;
    }

    return true;
  }

  async function handleFileChange(
    field: UploadFieldKey,
    event: ChangeEvent<HTMLInputElement>,
  ) {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    try {
      setError(null);
      const dataUrl = await readFileAsDataUrl(file);
      setSignUpForm((current) => ({
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
    } catch (nextError) {
      setError(
        nextError instanceof Error ? nextError.message : "File upload failed.",
      );
    } finally {
      event.target.value = "";
    }
  }

  async function handleLoginSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    if (!loginIdentifier.trim() || !loginPassword.trim()) {
      setError("Please enter your email or phone together with your password.");
      return;
    }

    try {
      setLoading(true);
      const data = await login({
        identifier: loginIdentifier.trim(),
        password: loginPassword,
      });

      if (data.user.role !== "lender" && data.user.role !== "admin") {
        throw new Error("Access denied. This portal is for lenders only.");
      }

      onLogin({
        lenderId: data.user.uid,
        displayName: data.user.fullName,
        email: data.user.email,
        accessToken: data.accessToken,
      });
    } catch (nextError) {
      setError(
        nextError instanceof Error ? nextError.message : "Login failed.",
      );
    } finally {
      setLoading(false);
    }
  }

  async function handleSignUpSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    if (registerStep === "account") {
      if (!validateAccountStep()) {
        return;
      }

      setRegisterStep("kyc");
      return;
    }

    if (!validateAccountStep() || !validateKycStep()) {
      return;
    }

    try {
      setLoading(true);

      try {
        await register({
          fullName: signUpForm.fullName.trim(),
          email: signUpForm.email.trim(),
          phone: signUpForm.phone.trim(),
          password: signUpForm.password,
          role: "lender",
        });
      } catch (registerError) {
        const message =
          registerError instanceof Error ? registerError.message : "";
        if (!message.toLowerCase().includes("already exists")) {
          throw registerError;
        }
      }

      const data = await login({
        identifier: signUpForm.email.trim(),
        password: signUpForm.password,
      });

      await submitKyc(data.accessToken, {
        documentType: signUpForm.kyc.documentType,
        documentNumber: signUpForm.kyc.documentNumber.trim(),
        fullName: signUpForm.kyc.fullName.trim(),
        issuingCountry: signUpForm.kyc.issuingCountry?.trim(),
        expiryDate: signUpForm.kyc.expiryDate?.trim(),
        documentFrontUrl: signUpForm.kyc.documentFrontUrl?.trim(),
        documentBackUrl: signUpForm.kyc.documentBackUrl?.trim(),
        selfieUrl: signUpForm.kyc.selfieUrl?.trim(),
        profilePictureUrl: signUpForm.kyc.profilePictureUrl?.trim(),
      });

      onLogin({
        lenderId: data.user.uid,
        displayName: data.user.fullName,
        email: data.user.email,
        accessToken: data.accessToken,
      });
    } catch (nextError) {
      setError(
        nextError instanceof Error ? nextError.message : "Registration failed.",
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="auth-shell">
      <section className="auth-card">
        <div className="auth-card__hero">
          <div className="auth-card__brand">
            <div className="auth-card__logo">SC</div>
            <div>
              <p className="auth-card__eyebrow">{authCopy.eyebrow}</p>
              <h1 className="auth-card__title">{authCopy.title}</h1>
            </div>
          </div>
          <p className="auth-card__subtitle">{authCopy.subtitle}</p>

          <ul className="auth-card__checklist" aria-label="Portal access">
            <li>Access your lender workspace</li>
            <li>Review requests and repayments</li>
            <li>Complete KYC during account setup</li>
          </ul>

          <p className="auth-card__footer-note">
            Smart Credit lender portal
          </p>
        </div>

        <div className="auth-card__form-panel">
          <div className="auth-tabs" role="tablist" aria-label="Auth mode">
            <button
              type="button"
              className={`auth-tab${activeMode === "login" ? " auth-tab--active" : ""}`}
              onClick={() => resetAuthMode("login")}
            >
              Login
            </button>
            <button
              type="button"
              className={`auth-tab${activeMode === "signup" ? " auth-tab--active" : ""}`}
              onClick={() => resetAuthMode("signup")}
            >
              Sign Up
            </button>
          </div>

          <div className="auth-card__form-content">
            <div className="auth-form__topbar">
              <div>
                <p className="auth-form__eyebrow">{authCopy.eyebrow}</p>
                <h2 className="auth-form__title">{authCopy.title}</h2>
                <p className="auth-form__subtitle">{authCopy.subtitle}</p>
              </div>

              {activeMode === "signup" ? (
                <span className="auth-step-badge">
                  {registerStep === "account" ? "Step 1 of 2" : "Step 2 of 2"}
                </span>
              ) : null}
            </div>

            {activeMode === "signup" ? (
              <div className="auth-progress" aria-label="Sign up progress">
                <span
                  className={`auth-progress__step${
                    registerStep === "account"
                      ? " auth-progress__step--active"
                      : " auth-progress__step--complete"
                  }`}
                >
                  Account
                </span>
                <span
                  className={`auth-progress__step${
                    registerStep === "kyc" ? " auth-progress__step--active" : ""
                  }`}
                >
                  KYC
                </span>
              </div>
            ) : null}

            {error ? <p className="auth-error">{error}</p> : null}

            {activeMode === "login" ? (
              <form className="auth-form" onSubmit={handleLoginSubmit}>
                <div className="auth-form__card">
                  <div className="auth-form__card-head">
                    <strong>Account details</strong>
                  </div>

                  <label className="auth-field">
                    <span className="auth-field__label">Email or phone</span>
                    <input
                      className="input"
                      type="text"
                      placeholder="name@example.com or +94 77 123 4567"
                      value={loginIdentifier}
                      onChange={(event) => setLoginIdentifier(event.target.value)}
                      disabled={loading}
                    />
                  </label>

                  <label className="auth-field">
                    <span className="auth-field__label">Password</span>
                    <input
                      className="input"
                      type="password"
                      placeholder="Enter your password"
                      value={loginPassword}
                      onChange={(event) => setLoginPassword(event.target.value)}
                      disabled={loading}
                    />
                  </label>
                </div>

                <button
                  type="submit"
                  className="auth-submit"
                  disabled={loading}
                >
                  {loading ? "Signing in..." : authCopy.buttonLabel}
                </button>
              </form>
            ) : (
              <form className="auth-form" onSubmit={handleSignUpSubmit}>
                {registerStep === "account" ? (
                  <>
                    <div className="auth-form__card">
                      <div className="auth-form__card-head">
                        <strong>Account details</strong>
                        <span>Set up your lender profile and sign-in details.</span>
                      </div>

                      <div className="auth-form__grid">
                        <label className="auth-field auth-field--full">
                          <span className="auth-field__label">Full name</span>
                          <input
                            className="input"
                            type="text"
                            placeholder="Company Name / Your Name"
                            value={signUpForm.fullName}
                            onChange={(event) =>
                              setSignUpForm((current) => ({
                                ...current,
                                fullName: event.target.value,
                                kyc: {
                                  ...current.kyc,
                                  fullName:
                                    current.kyc.fullName || event.target.value,
                                },
                              }))
                            }
                            disabled={loading}
                          />
                        </label>

                        <label className="auth-field">
                          <span className="auth-field__label">Email</span>
                          <input
                            className="input"
                            type="email"
                            placeholder="name@example.com"
                            value={signUpForm.email}
                            onChange={(event) =>
                              setSignUpForm((current) => ({
                                ...current,
                                email: event.target.value,
                              }))
                            }
                            disabled={loading}
                          />
                        </label>

                        <label className="auth-field">
                          <span className="auth-field__label">Phone</span>
                          <input
                            className="input"
                            type="tel"
                            placeholder="+94 77 123 4567"
                            value={signUpForm.phone}
                            onChange={(event) =>
                              setSignUpForm((current) => ({
                                ...current,
                                phone: event.target.value,
                              }))
                            }
                            disabled={loading}
                          />
                        </label>

                        <label className="auth-field">
                          <span className="auth-field__label">Password</span>
                          <input
                            className="input"
                            type="password"
                            placeholder="Minimum 8 characters"
                            value={signUpForm.password}
                            onChange={(event) =>
                              setSignUpForm((current) => ({
                                ...current,
                                password: event.target.value,
                              }))
                            }
                            disabled={loading}
                          />
                        </label>

                        <label className="auth-field">
                          <span className="auth-field__label">
                            Confirm password
                          </span>
                          <input
                            className="input"
                            type="password"
                            placeholder="Repeat your password"
                            value={signUpForm.confirmPassword}
                            onChange={(event) =>
                              setSignUpForm((current) => ({
                                ...current,
                                confirmPassword: event.target.value,
                              }))
                            }
                            disabled={loading}
                          />
                        </label>
                      </div>
                    </div>

                    <button
                      type="submit"
                      className="auth-submit"
                      disabled={loading}
                    >
                      {loading ? "Continuing..." : authCopy.buttonLabel}
                    </button>
                  </>
                ) : (
                  <>
                    <div className="auth-notice">
                      <strong>Identity verification</strong>
                      <span>
                        Upload the required files to complete your lender
                        account.
                      </span>
                    </div>

                    <div className="auth-form__card">
                      <div className="auth-form__card-head">
                        <strong>KYC details</strong>
                        <span>Make sure the information matches your ID.</span>
                      </div>

                      <div className="auth-form__grid">
                        <label className="auth-field">
                          <span className="auth-field__label">Document type</span>
                          <select
                            className="input"
                            value={signUpForm.kyc.documentType}
                            onChange={(event) =>
                              setSignUpForm((current) => ({
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

                        <label className="auth-field">
                          <span className="auth-field__label">
                            {documentNumberLabel}
                          </span>
                          <input
                            className="input"
                            type="text"
                            placeholder="Enter the number on your ID"
                            value={signUpForm.kyc.documentNumber}
                            onChange={(event) =>
                              setSignUpForm((current) => ({
                                ...current,
                                kyc: {
                                  ...current.kyc,
                                  documentNumber: event.target.value,
                                },
                              }))
                            }
                            disabled={loading}
                          />
                        </label>

                        <label className="auth-field auth-field--full">
                          <span className="auth-field__label">
                            Full name on {documentLabel}
                          </span>
                          <input
                            className="input"
                            type="text"
                            placeholder={`As shown on your ${documentLabel}`}
                            value={signUpForm.kyc.fullName}
                            onChange={(event) =>
                              setSignUpForm((current) => ({
                                ...current,
                                kyc: {
                                  ...current.kyc,
                                  fullName: event.target.value,
                                },
                              }))
                            }
                            disabled={loading}
                          />
                        </label>

                        <label className="auth-field">
                          <span className="auth-field__label">
                            Issuing country
                          </span>
                          <input
                            className="input"
                            type="text"
                            placeholder="Sri Lanka"
                            value={signUpForm.kyc.issuingCountry}
                            onChange={(event) =>
                              setSignUpForm((current) => ({
                                ...current,
                                kyc: {
                                  ...current.kyc,
                                  issuingCountry: event.target.value,
                                },
                              }))
                            }
                            disabled={loading}
                          />
                        </label>

                        <label className="auth-field">
                          <span className="auth-field__label">Expiry date</span>
                          <input
                            className="input"
                            type="date"
                            value={signUpForm.kyc.expiryDate}
                            onChange={(event) =>
                              setSignUpForm((current) => ({
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

                    <div className="auth-form__card">
                      <div className="auth-form__card-head">
                        <strong>Uploads</strong>
                        <span>Add clear files for faster review.</span>
                      </div>

                      <div className="auth-upload-list">
                        <label className="auth-upload-card">
                          <span className="auth-field__label">
                            {documentLabel} front
                          </span>
                          <input
                            type="file"
                            accept="image/*,.pdf"
                            onChange={(event) =>
                              void handleFileChange("documentFrontUrl", event)
                            }
                            disabled={loading}
                          />
                          <small className="auth-upload-card__meta">
                            {uploadStatus.documentFrontUrl ?? "Required"}
                          </small>
                        </label>

                        <label className="auth-upload-card">
                          <span className="auth-field__label">
                            {documentLabel} back
                          </span>
                          <input
                            type="file"
                            accept="image/*,.pdf"
                            onChange={(event) =>
                              void handleFileChange("documentBackUrl", event)
                            }
                            disabled={loading}
                          />
                          <small className="auth-upload-card__meta">
                            {uploadStatus.documentBackUrl ?? "Optional"}
                          </small>
                        </label>

                        <label className="auth-upload-card">
                          <span className="auth-field__label">
                            Selfie with {documentLabel}
                          </span>
                          <input
                            type="file"
                            accept="image/*"
                            onChange={(event) =>
                              void handleFileChange("selfieUrl", event)
                            }
                            disabled={loading}
                          />
                          <small className="auth-upload-card__meta">
                            {uploadStatus.selfieUrl ?? "Required"}
                          </small>
                        </label>

                        <label className="auth-upload-card">
                          <span className="auth-field__label">
                            Profile picture
                          </span>
                          <input
                            type="file"
                            accept="image/*"
                            onChange={(event) =>
                              void handleFileChange("profilePictureUrl", event)
                            }
                            disabled={loading}
                          />
                          <small className="auth-upload-card__meta">
                            {uploadStatus.profilePictureUrl ?? "Required"}
                          </small>
                        </label>
                      </div>
                    </div>

                    <label className="auth-checkbox">
                      <input
                        type="checkbox"
                        checked={signUpForm.acceptedTerms}
                        onChange={(event) =>
                          setSignUpForm((current) => ({
                            ...current,
                            acceptedTerms: event.target.checked,
                          }))
                        }
                        disabled={loading}
                      />
                      <span>
                        I agree to the platform terms and consent to identity
                        verification.
                      </span>
                    </label>

                    <div className="auth-form__actions">
                      <button
                        type="button"
                        className="auth-secondary-button"
                        onClick={() => {
                          setRegisterStep("account");
                          setError(null);
                        }}
                        disabled={loading}
                      >
                        Back
                      </button>

                      <button
                        type="submit"
                        className="auth-submit"
                        disabled={loading}
                      >
                        {loading
                          ? "Creating account..."
                          : authCopy.buttonLabel}
                      </button>
                    </div>
                  </>
                )}
              </form>
            )}
          </div>
        </div>
      </section>
    </main>
  );
}
