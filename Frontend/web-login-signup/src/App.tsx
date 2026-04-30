import { useMemo, useState } from 'react';
import type { ChangeEvent, FormEvent } from 'react';

import { ApiError, authApi } from './api';
import type {
  AuthMode,
  KycFormState,
  LoginFormState,
  PublicUserRole,
  RegisterFormState,
  StoredSession,
} from './types';

const STORAGE_KEY = 'smart-credit-shared-auth-session';
type RegisterStep = 'account' | 'kyc';

const initialLoginForm: LoginFormState = {
  identifier: '',
  password: '',
};

const initialKycForm: KycFormState = {
  documentType: 'national_id',
  documentNumber: '',
  fullName: '',
  issuingCountry: 'Sri Lanka',
  expiryDate: '',
  documentFrontUrl: '',
  documentBackUrl: '',
  selfieUrl: '',
};

const initialRegisterForm: RegisterFormState = {
  fullName: '',
  email: '',
  phone: '',
  password: '',
  confirmPassword: '',
  role: 'lender',
  kyc: initialKycForm,
};

function loadStoredSession(): StoredSession | null {
  const rawValue = localStorage.getItem(STORAGE_KEY);

  if (!rawValue) {
    return null;
  }

  try {
    return JSON.parse(rawValue) as StoredSession;
  } catch {
    localStorage.removeItem(STORAGE_KEY);
    return null;
  }
}

function toDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () =>
      resolve(typeof reader.result === 'string' ? reader.result : '');
    reader.onerror = () =>
      reject(new Error('We could not read the selected file.'));
    reader.readAsDataURL(file);
  });
}

export default function App() {
  const [mode, setMode] = useState<AuthMode>('login');
  const [registerStep, setRegisterStep] = useState<RegisterStep>('account');
  const [loginForm, setLoginForm] = useState<LoginFormState>(initialLoginForm);
  const [registerForm, setRegisterForm] =
    useState<RegisterFormState>(initialRegisterForm);
  const [session, setSession] = useState<StoredSession | null>(() =>
    loadStoredSession(),
  );
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [uploadStatus, setUploadStatus] = useState<Record<string, string>>({});
  const [apiError, setApiError] = useState('');
  const [infoMessage, setInfoMessage] = useState('');
  const [loading, setLoading] = useState(false);

  const registerRoleLabel = registerForm.role === 'borrower' ? 'borrower' : 'lender';

  const authSummary = useMemo(() => {
    if (!session) {
      return null;
    }

    return [
      { label: 'Account', value: session.user.fullName },
      { label: 'Email', value: session.user.email },
      { label: 'Phone', value: session.user.phone || 'Not provided' },
      { label: 'Role', value: session.user.role },
      { label: 'KYC Status', value: session.user.kycStatus || 'pending' },
    ];
  }, [session]);

  function resetMessages() {
    setApiError('');
    setInfoMessage('');
    setFieldErrors({});
  }

  function switchMode(nextMode: AuthMode) {
    resetMessages();
    setMode(nextMode);
    if (nextMode === 'register') {
      setRegisterStep('account');
    }
  }

  function validateLogin(): boolean {
    const nextErrors: Record<string, string> = {};

    if (!loginForm.identifier.trim()) {
      nextErrors.identifier = 'Email or phone is required.';
    }

    if (!loginForm.password.trim()) {
      nextErrors.password = 'Password is required.';
    }

    setFieldErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  }

  function validateRegisterAccount(): boolean {
    const nextErrors: Record<string, string> = {};

    if (!registerForm.fullName.trim()) {
      nextErrors.fullName = 'Full name is required.';
    }

    if (!registerForm.email.trim()) {
      nextErrors.email = 'Email is required.';
    } else if (!/^\S+@\S+\.\S+$/.test(registerForm.email.trim())) {
      nextErrors.email = 'Enter a valid email address.';
    }

    if (!registerForm.phone.trim()) {
      nextErrors.phone = 'Phone is required.';
    }

    if (!registerForm.password.trim()) {
      nextErrors.password = 'Password is required.';
    } else if (registerForm.password.length < 8) {
      nextErrors.password = 'Password must be at least 8 characters long.';
    }

    if (!registerForm.confirmPassword.trim()) {
      nextErrors.confirmPassword = 'Please confirm your password.';
    } else if (registerForm.confirmPassword !== registerForm.password) {
      nextErrors.confirmPassword = 'Passwords do not match.';
    }

    setFieldErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  }

  function validateKycDetails(): boolean {
    const nextErrors: Record<string, string> = {};

    if (!registerForm.kyc.fullName.trim()) {
      nextErrors.kycFullName = 'Full name on the ID is required.';
    }

    if (!registerForm.kyc.documentNumber.trim()) {
      nextErrors.documentNumber = 'NIC number is required.';
    }

    if (!registerForm.kyc.documentFrontUrl.trim()) {
      nextErrors.documentFrontUrl = 'Upload the front of the NIC.';
    }

    if (!registerForm.kyc.selfieUrl.trim()) {
      nextErrors.selfieUrl = 'Upload the selfie with your NIC.';
    }

    setFieldErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  }

  function handleContinueToKyc() {
    resetMessages();

    if (!validateRegisterAccount()) {
      return;
    }

    setRegisterStep('kyc');
  }

  async function handleLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    resetMessages();

    if (!validateLogin()) {
      return;
    }

    try {
      setLoading(true);
      const response = await authApi.login({
        identifier: loginForm.identifier.trim(),
        password: loginForm.password,
      });

      const nextSession = {
        accessToken: response.accessToken,
        user: response.user,
      };

      setSession(nextSession);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(nextSession));
      setInfoMessage('Signed in successfully.');
    } catch (error) {
      setApiError(error instanceof Error ? error.message : 'Login failed.');
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
      const createdRoleLabel =
        registerForm.role === 'borrower' ? 'borrower' : 'lender';

      await authApi.register({
        fullName: registerForm.fullName.trim(),
        email: registerForm.email.trim(),
        phone: registerForm.phone.trim(),
        password: registerForm.password,
        role: registerForm.role,
      });

      const authResponse = await authApi.login({
        identifier: registerForm.email.trim(),
        password: registerForm.password,
        role: registerForm.role,
      });

      await authApi.submitKyc(authResponse.accessToken, {
        documentType: registerForm.kyc.documentType,
        documentNumber: registerForm.kyc.documentNumber.trim(),
        fullName: registerForm.kyc.fullName.trim(),
        issuingCountry: registerForm.kyc.issuingCountry.trim(),
        expiryDate: registerForm.kyc.expiryDate.trim() || undefined,
        documentFrontUrl: registerForm.kyc.documentFrontUrl,
        documentBackUrl: registerForm.kyc.documentBackUrl || undefined,
        selfieUrl: registerForm.kyc.selfieUrl,
      });

      const nextSession = {
        accessToken: authResponse.accessToken,
        user: {
          ...authResponse.user,
          kycStatus: 'pending',
        },
      };

      setSession(nextSession);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(nextSession));
      setRegisterForm(initialRegisterForm);
      setUploadStatus({});
      setMode('login');
      setRegisterStep('account');
      setLoginForm({
        identifier: nextSession.user.email,
        password: '',
      });
      setInfoMessage(
        `Account created and KYC submitted successfully. Your ${createdRoleLabel} account is now waiting for review.`,
      );
    } catch (error) {
      if (error instanceof ApiError) {
        setApiError(error.message);
      } else {
        setApiError(
          error instanceof Error
            ? error.message
            : 'Registration failed. Please try again.',
        );
      }
    } finally {
      setLoading(false);
    }
  }

  async function handleFileUpload(
    field: 'documentFrontUrl' | 'documentBackUrl' | 'selfieUrl',
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
      setFieldErrors((current) => {
        const next = { ...current };
        delete next[field];
        return next;
      });
    } catch (error) {
      setApiError(
        error instanceof Error ? error.message : 'File upload failed.',
      );
    } finally {
      event.target.value = '';
    }
  }

  function handleLogout() {
    setSession(null);
    localStorage.removeItem(STORAGE_KEY);
    setInfoMessage('Signed out successfully.');
  }

  function getDocumentNumberLabel() {
    switch (registerForm.kyc.documentType) {
      case 'passport':
        return 'Passport number';
      case 'driving_license':
        return 'License number';
      default:
        return 'NIC number';
    }
  }

  return (
    <main className="page-shell web-auth-shell">
      <section className="web-hero-panel">
        <div className="brand-lockup">
          <span className="brand-mark">SC</span>
          <div>
            <strong>Smart Credit+</strong>
            <p>Shared platform sign in</p>
          </div>
        </div>

        <div className="hero-copy-block">
          <h1 className="hero-title">
            One secure <span>login</span> for every Smart Credit role.
          </h1>
          <p className="hero-copy">
            Sign in with your credentials and let the backend resolve the
            correct access role for your account. Public account creation is
            available for lenders and borrowers, with KYC handled in a separate
            second step.
          </p>
        </div>

        <div className="hero-stat-row compact-hero-stat-row">
          <div className="hero-stat-card auth-stat-card">
            <strong>Role based</strong>
            <span>Admin, lender, or borrower</span>
          </div>
          <div className="hero-stat-card auth-stat-card">
            <strong>Step 2 KYC</strong>
            <span>Separate onboarding page</span>
          </div>
        </div>
      </section>

      <section className="auth-panel auth-panel-centered">
        <div className="auth-content-stack auth-stack">
          <div className="heading-block auth-heading-block auth-heading">
            <div className="auth-kicker-row">
              <span className="auth-kicker">
                {mode === 'login' ? 'Unified access' : 'Guided onboarding'}
              </span>
              <span className="auth-kicker auth-kicker-muted">
                {mode === 'login'
                  ? 'Account session'
                  : `${registerRoleLabel} account setup`}
              </span>
            </div>
            <h2>
              {mode === 'login'
                ? 'Sign in'
                : `Create ${registerRoleLabel} account`}
            </h2>
            <p>
              {mode === 'login'
                ? 'Use your email or phone and password. Your account role is confirmed by the backend after authentication.'
                : `Register your ${registerRoleLabel} account and submit KYC in the same flow.`}
            </p>
          </div>

          <div className="mode-switch auth-mode-switch auth-toggle-wide">
            <button
              type="button"
              className={`mode-button ${mode === 'login' ? 'active' : ''}`}
              onClick={() => switchMode('login')}
            >
              Sign In
            </button>
            <button
              type="button"
              className={`mode-button ${mode === 'register' ? 'active' : ''}`}
              onClick={() => switchMode('register')}
            >
              Create Account
            </button>
          </div>

          {(apiError || infoMessage) && (
            <div className={apiError ? 'feedback-banner error' : 'feedback-banner success'}>
              {apiError || infoMessage}
            </div>
          )}

          {session ? (
            <section className="auth-card success-card">
              <div className="success-pill">Signed in</div>
              <h3>{session.user.fullName}</h3>
              <p className="success-copy">
                Your shared authentication frontend is connected successfully.
              </p>
              <div className="session-summary">
                {authSummary?.map((item) => (
                  <div key={item.label} className="session-row">
                    <span>{item.label}</span>
                    <strong>{item.value}</strong>
                  </div>
                ))}
              </div>
              <div className="trust-inline-row">
                <span className="trust-inline-chip">JWT session active</span>
                <span className="trust-inline-chip">Role confirmed</span>
                <span className="trust-inline-chip">KYC synced</span>
              </div>
              <button
                type="button"
                className="primary-button"
                onClick={handleLogout}
              >
                Sign Out
              </button>
            </section>
          ) : mode === 'login' ? (
            <form className="auth-card auth-form" onSubmit={handleLogin}>
              <div className="auth-form-shell">
                <div className="field-group-card">
                  <div className="section-card-head">
                    <strong>Sign in</strong>
                    <span>Enter the credentials stored for your Smart Credit account.</span>
                  </div>

                  <div className="role-strategy-panel">
                    <div className="role-strategy-item">
                      <strong>Backend-resolved access</strong>
                      <span>
                        Your session is issued with the role stored on the backend, so the login form stays focused on identity and password only.
                      </span>
                    </div>
                  </div>
                </div>

                <div className="field-group-card field-group-card-soft">
                  <label className="field">
                    <span>Email or phone</span>
                    <input
                      value={loginForm.identifier}
                      onChange={(event) =>
                        setLoginForm((current) => ({
                          ...current,
                          identifier: event.target.value,
                        }))
                      }
                      placeholder="name@example.com or +94 77 123 4567"
                      disabled={loading}
                    />
                    {fieldErrors.identifier && (
                      <small className="error-text">{fieldErrors.identifier}</small>
                    )}
                  </label>

                  <label className="field">
                    <span>Password</span>
                    <input
                      type="password"
                      value={loginForm.password}
                      onChange={(event) =>
                        setLoginForm((current) => ({
                          ...current,
                          password: event.target.value,
                        }))
                      }
                      placeholder="Enter your password"
                      disabled={loading}
                    />
                    {fieldErrors.password && (
                      <small className="error-text">{fieldErrors.password}</small>
                    )}
                  </label>
                </div>
              </div>

              <div className="inline-note">
                <span className="inline-note-dot" />
                <p>
                  The backend validates your credentials and signs the session with the role assigned to your account.
                </p>
              </div>

              <button type="submit" className="primary-button" disabled={loading}>
                {loading ? 'Signing in...' : 'Sign In'}
              </button>
            </form>
          ) : (
            <form className="auth-card auth-form" onSubmit={handleRegister}>
              <div className="onboarding-strip">
                <div className={`onboarding-step ${registerStep === 'account' ? 'active' : 'complete'}`}>
                  <span>1</span>
                  <div>
                    <strong>Account</strong>
                    <p>Create sign-in credentials.</p>
                  </div>
                </div>
                <div className={`onboarding-step ${registerStep === 'kyc' ? 'active' : ''}`}>
                  <span>2</span>
                  <div>
                    <strong>KYC</strong>
                    <p>Submit identity evidence.</p>
                  </div>
                </div>
              </div>

              <div className="field-group-card">
                <div className="field">
                  <span>Create account for</span>
                  <div className="role-chip-row">
                    {(['lender', 'borrower'] as PublicUserRole[]).map((role) => (
                      <button
                        key={role}
                        type="button"
                        className={`role-chip ${registerForm.role === role ? 'active' : ''}`}
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
                </div>

                <div className="role-strategy-panel">
                  <div className="role-strategy-item">
                    <strong>{registerRoleLabel === 'borrower' ? 'Borrower onboarding' : 'Lender onboarding'}</strong>
                    <span>
                      {registerRoleLabel === 'borrower'
                        ? 'This path is tuned for mobile-first borrowers, applications, and repayments.'
                        : 'This path prepares a verified lender account for shared web and mobile access.'}
                    </span>
                  </div>
                  <div className="role-strategy-item">
                    <strong>KYC included</strong>
                    <span>
                      Identity review starts immediately after the account and first session are created.
                    </span>
                  </div>
                </div>
              </div>

              {registerStep === 'account' ? (
                <>
                  <div className="field-group-card">
                    <div className="section-card-head">
                      <strong>Account details</strong>
                      <span>Use the contact details and password you will sign in with later.</span>
                    </div>

                    <div className="form-grid two-column">
                      <label className="field">
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
                        {fieldErrors.fullName && (
                          <small className="error-text">{fieldErrors.fullName}</small>
                        )}
                      </label>

                      <label className="field">
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
                        {fieldErrors.phone && (
                          <small className="error-text">{fieldErrors.phone}</small>
                        )}
                      </label>
                    </div>

                    <label className="field">
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
                      {fieldErrors.email && (
                        <small className="error-text">{fieldErrors.email}</small>
                      )}
                    </label>

                    <div className="form-grid two-column">
                      <label className="field">
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
                        {fieldErrors.password && (
                          <small className="error-text">{fieldErrors.password}</small>
                        )}
                      </label>

                      <label className="field">
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
                        {fieldErrors.confirmPassword && (
                          <small className="error-text">
                            {fieldErrors.confirmPassword}
                          </small>
                        )}
                      </label>
                    </div>
                  </div>

                  <button
                    type="button"
                    className="primary-button"
                    onClick={handleContinueToKyc}
                    disabled={loading}
                  >
                    Continue to KYC
                  </button>
                </>
              ) : (
                <>
                  <div className="section-divider">
                    <strong>KYC verification</strong>
                    <span>
                      Submit your identity details on this separate step so your {registerRoleLabel} account can be reviewed immediately.
                    </span>
                  </div>

                  <div className="field-group-card">
                    <div className="section-card-head">
                      <strong>Identity details</strong>
                      <span>Make sure the name and number exactly match the selected ID.</span>
                    </div>

                    <label className="field">
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
                      {fieldErrors.kycFullName && (
                        <small className="error-text">{fieldErrors.kycFullName}</small>
                      )}
                    </label>

                    <div className="form-grid two-column">
                      <label className="field">
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

                      <label className="field">
                        <span>{getDocumentNumberLabel()}</span>
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
                        {fieldErrors.documentNumber && (
                          <small className="error-text">
                            {fieldErrors.documentNumber}
                          </small>
                        )}
                      </label>
                    </div>

                    <div className="form-grid two-column">
                      <label className="field">
                        <span>Issuing country</span>
                        <input
                          value={registerForm.kyc.issuingCountry}
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

                      <label className="field">
                        <span>Expiry date</span>
                        <input
                          type="date"
                          value={registerForm.kyc.expiryDate}
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

                  <div className="field-group-card">
                    <div className="section-card-head">
                      <strong>Upload files</strong>
                      <span>Upload clear files for your NIC front, optional back, and selfie with the NIC.</span>
                    </div>

                    <div className="form-grid two-column upload-grid">
                      <label className="field">
                        <span>NIC front</span>
                        <input
                          type="file"
                          accept="image/*,.pdf"
                          onChange={(event) =>
                            void handleFileUpload('documentFrontUrl', event)
                          }
                          disabled={loading}
                        />
                        {uploadStatus.documentFrontUrl && (
                          <small className="success-text">
                            Uploaded: {uploadStatus.documentFrontUrl}
                          </small>
                        )}
                        {fieldErrors.documentFrontUrl && (
                          <small className="error-text">
                            {fieldErrors.documentFrontUrl}
                          </small>
                        )}
                      </label>

                      <label className="field">
                        <span>NIC back</span>
                        <input
                          type="file"
                          accept="image/*,.pdf"
                          onChange={(event) =>
                            void handleFileUpload('documentBackUrl', event)
                          }
                          disabled={loading}
                        />
                        {uploadStatus.documentBackUrl && (
                          <small className="success-text">
                            Uploaded: {uploadStatus.documentBackUrl}
                          </small>
                        )}
                      </label>
                    </div>

                    <label className="field">
                      <span>Selfie with NIC</span>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(event) => void handleFileUpload('selfieUrl', event)}
                        disabled={loading}
                      />
                      {uploadStatus.selfieUrl && (
                        <small className="success-text">
                          Uploaded: {uploadStatus.selfieUrl}
                        </small>
                      )}
                      {fieldErrors.selfieUrl && (
                        <small className="error-text">{fieldErrors.selfieUrl}</small>
                      )}
                    </label>
                  </div>

                  <div className="form-action-row">
                    <button
                      type="button"
                      className="secondary-button"
                      onClick={() => setRegisterStep('account')}
                      disabled={loading}
                    >
                      Back
                    </button>
                    <button type="submit" className="primary-button" disabled={loading}>
                      {loading ? 'Creating account...' : 'Create Account'}
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
