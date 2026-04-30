import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';

import { AgreementModal } from './components/AgreementModal';
import { KycSubmissionForm } from './components/KycSubmissionForm';
import { LegalDocumentPanel } from './components/LegalDocumentPanel';
import { ApiError, authApi } from './api';
import type {
  AuthMode,
  DashboardListItem,
  DashboardResponse,
  PublicUserRole,
  RegisterPayload,
  SessionResponse,
  StoredSession,
  SubmitKycPayload,
  UserRole,
} from './types';

const STORAGE_KEY = 'smart-credit-auth-session';

type LoginFormState = {
  identifier: string;
  password: string;
};

type KycFormState = SubmitKycPayload;

type RegisterFormState = {
  fullName: string;
  email: string;
  phone: string;
  password: string;
  confirmPassword: string;
  role: PublicUserRole;
  kyc: KycFormState;
};

type DashboardTab = 'overview' | 'account' | 'kyc' | 'legal';

function loadStoredSession(): StoredSession | null {
  const storedValue = localStorage.getItem(STORAGE_KEY);

  if (!storedValue) {
    return null;
  }

  try {
    return JSON.parse(storedValue) as StoredSession;
  } catch {
    localStorage.removeItem(STORAGE_KEY);
    return null;
  }
}

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

async function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(typeof reader.result === 'string' ? reader.result : '');
    reader.onerror = () => reject(new Error('Failed to read the selected file.'));
    reader.readAsDataURL(file);
  });
}

export default function App() {
  const [mode, setMode] = useState<AuthMode>('login');
  const [loginForm, setLoginForm] = useState<LoginFormState>(initialLoginForm);
  const [registerForm, setRegisterForm] = useState<RegisterFormState>(
    initialRegisterForm,
  );
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [apiError, setApiError] = useState('');
  const [infoMessage, setInfoMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [dashboard, setDashboard] = useState<DashboardResponse | null>(null);
  const [sessionStatus, setSessionStatus] = useState<SessionResponse | null>(null);
  const [dashboardLoading, setDashboardLoading] = useState(false);
  const [dashboardError, setDashboardError] = useState('');
  const [activeTab, setActiveTab] = useState<DashboardTab>('overview');
  const [session, setSession] = useState<StoredSession | null>(() =>
    loadStoredSession(),
  );
  const [showAgreementModal, setShowAgreementModal] = useState(false);
  const [registerUploadStatus, setRegisterUploadStatus] = useState<Record<string, string>>({});
  const [roleSelection, setRoleSelection] = useState<'admin' | 'lender' | null>(null);
  
  const isAdminPortal = session ? session.user.role === 'admin' : roleSelection === 'admin';

  useEffect(() => {
    if (!session) {
      localStorage.removeItem(STORAGE_KEY);
      return;
    }

    localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
  }, [session]);

  useEffect(() => {
    if (!session?.accessToken) {
      setDashboard(null);
      setSessionStatus(null);
      setDashboardError('');
      setDashboardLoading(false);
      setActiveTab('overview');
      return;
    }

    void loadDashboard(session.accessToken);
  }, [session?.accessToken]);

  async function loadDashboard(accessToken: string) {
    try {
      setDashboardLoading(true);
      setDashboardError('');
      const sessionResponse = await authApi.session(accessToken);
      const response = await authApi.dashboard(
        accessToken,
        sessionResponse.activeRole,
      );

      setSessionStatus(sessionResponse);
      setDashboard(response);
      setSession({
        accessToken,
        user: sessionResponse.user,
      });
    } catch (error) {
      setDashboard(null);
      setSessionStatus(null);

      if (error instanceof ApiError && error.status === 401) {
        setSession(null);
        localStorage.removeItem(STORAGE_KEY);
        return;
      }

      setDashboardError(
        error instanceof Error
          ? error.message
          : 'We could not load your workspace right now.',
      );
    } finally {
      setDashboardLoading(false);
    }
  }

  function resetMessages() {
    setFieldErrors({});
    setApiError('');
    setInfoMessage('');
  }

  async function handleRegisterFileUpload(
    field: 'documentFrontUrl' | 'documentBackUrl' | 'selfieUrl',
    file: File | null,
  ) {
    if (!file) {
      return;
    }

    try {
      const dataUrl = await readFileAsDataUrl(file);
      setRegisterForm((current) => ({
        ...current,
        kyc: {
          ...current.kyc,
          [field]: dataUrl,
        },
      }));
      setRegisterUploadStatus((current) => ({
        ...current,
        [field]: file.name,
      }));
    } catch (error) {
      setApiError(error instanceof Error ? error.message : 'File upload failed.');
    }
  }

  function validateLogin(): boolean {
    const errors: Record<string, string> = {};

    if (!loginForm.identifier.trim()) {
      errors.identifier =
        isAdminPortal
          ? 'Admin email is required.'
          : 'Email or phone is required.';
    }

    if (!loginForm.password.trim()) {
      errors.password = 'Password is required.';
    }

    if (isAdminPortal && loginForm.identifier.trim()) {
      if (!/^\S+@\S+\.\S+$/.test(loginForm.identifier.trim())) {
        errors.identifier = 'Enter a valid admin email address.';
      }
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  }

  function validateRegister(): boolean {
    const errors: Record<string, string> = {};

    if (!registerForm.fullName.trim()) {
      errors.fullName = 'Full name is required.';
    }

    if (!registerForm.email.trim()) {
      errors.email = 'Email is required.';
    } else if (!/^\S+@\S+\.\S+$/.test(registerForm.email.trim())) {
      errors.email = 'Enter a valid email address.';
    }

    if (!registerForm.phone.trim()) {
      errors.phone = 'Phone is required.';
    }

    if (!registerForm.password.trim()) {
      errors.password = 'Password is required.';
    } else if (registerForm.password.length < 8) {
      errors.password = 'Password must be at least 8 characters long.';
    }

    if (!registerForm.confirmPassword.trim()) {
      errors.confirmPassword = 'Please confirm your password.';
    } else if (registerForm.password !== registerForm.confirmPassword) {
      errors.confirmPassword = 'Passwords do not match.';
    }

    if (!registerForm.kyc.documentNumber.trim()) {
      errors.documentNumber = 'Document number is required.';
    }

    if (!registerForm.kyc.fullName.trim()) {
      errors.kycFullName = 'KYC full name is required.';
    }

    if (!registerForm.kyc.documentFrontUrl?.trim()) {
      errors.documentFrontUrl = 'Document front image URL is required.';
    }

    if (!registerForm.kyc.selfieUrl?.trim()) {
      errors.selfieUrl = 'Selfie with document is required.';
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  }

  async function handleLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    resetMessages();

    if (!validateLogin()) {
      return;
    }

    try {
      setLoading(true);
      if (!roleSelection) {
        setApiError('Please select a login type (Admin or Lender)');
        setLoading(false);
        return;
      }
      
      const response = await authApi.login({
        identifier: loginForm.identifier.trim(),
        password: loginForm.password,
        role: roleSelection,
      });

      setActiveTab('overview');
      const sessionData = {
        accessToken: response.accessToken,
        user: response.user,
      };
      setSession(sessionData);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(sessionData));
      
      // Redirect lenders to the dedicated lender auth frontend
      if (response.user.role === 'lender') {
        setTimeout(() => {
          window.location.href = 'http://localhost:5177';
        }, 500);
      }
    } catch (error) {
      setApiError(error instanceof Error ? error.message : 'Login failed.');
    } finally {
      setLoading(false);
    }
  }

  async function handleRegister(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    resetMessages();

    if (!validateRegister()) {
      return;
    }

    setShowAgreementModal(true);
  }

  async function handleAgreementAccept() {
    setShowAgreementModal(false);

    if (!roleSelection || roleSelection !== 'lender') {
      setApiError('Only lender accounts can be created. Admin accounts are system-managed.');
      return;
    }

    const payload: RegisterPayload = {
      fullName: registerForm.fullName.trim(),
      email: registerForm.email.trim(),
      phone: registerForm.phone.trim(),
      password: registerForm.password,
      role: 'lender',
    };

    const kycPayload: SubmitKycPayload = {
      documentType: registerForm.kyc.documentType,
      documentNumber: registerForm.kyc.documentNumber.trim(),
      fullName: registerForm.kyc.fullName.trim(),
      issuingCountry: registerForm.kyc.issuingCountry?.trim(),
      expiryDate: registerForm.kyc.expiryDate,
      documentFrontUrl: registerForm.kyc.documentFrontUrl?.trim(),
      documentBackUrl: registerForm.kyc.documentBackUrl?.trim(),
      selfieUrl: registerForm.kyc.selfieUrl?.trim(),
    };

    try {
      setLoading(true);
      await authApi.register(payload);
      const loginResponse = await authApi.login({
        identifier: payload.email,
        password: payload.password,
        role: roleSelection,
      });
      await authApi.submitKyc(loginResponse.accessToken, kycPayload);

      setInfoMessage(
        `${roleSelection.charAt(0).toUpperCase() + roleSelection.slice(1)} account created and KYC submitted successfully.`,
      );
      const sessionData = {
        accessToken: loginResponse.accessToken,
        user: loginResponse.user,
      };
      setSession(sessionData);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(sessionData));
      
      // Redirect lenders to the dedicated lender auth frontend
      if (roleSelection === 'lender') {
        setTimeout(() => {
          window.location.href = 'http://localhost:5177';
        }, 500);
      } else {
        setActiveTab('overview');
        setRegisterForm(initialRegisterForm);
        setMode('login');
      }
    } catch (error) {
      setApiError(
        error instanceof Error ? error.message : 'Registration failed.',
      );
    } finally {
      setLoading(false);
    }
  }

  function handleLogout() {
    setDashboard(null);
    setSessionStatus(null);
    setDashboardError('');
    setDashboardLoading(false);
    setActiveTab('overview');
    setSession(null);
    setLoginForm(initialLoginForm);
    setFieldErrors({});
    setApiError('');
    setInfoMessage('');
    setMode('login');
  }

  if (session) {
    const currentDashboard = dashboard;

    return (
      <main className="dashboard-shell">
        <section className="dashboard-panel dashboard-hero">
          <div className="dashboard-topbar">
            <div>
              <div className="panel-badge">
                {session.user.role === 'admin' ? 'Admin Control Center' : 'Lender Workspace'}
              </div>
              <p className="dashboard-role-label">
                {session.user.role === 'admin'
                  ? 'Admin website'
                  : session.user.role === 'lender'
                    ? 'Lender website'
                    : 'Borrower access'}
              </p>
            </div>

            <div className="dashboard-actions">
              <button
                className="secondary-button"
                type="button"
                onClick={() => void loadDashboard(session.accessToken)}
              >
                Refresh data
              </button>
              <button
                className="secondary-button"
                type="button"
                onClick={handleLogout}
              >
                Log out
              </button>
            </div>
          </div>

          <h1 className="dashboard-title">
            {currentDashboard?.headline ?? `Welcome back, ${session.user.fullName}`}
          </h1>
          <p className="dashboard-copy">
            {currentDashboard?.summary ??
              'Your workspace is loading. We are preparing the latest platform data.'}
          </p>

          <div className="dashboard-user-strip">
            <div className="info-chip">
              <span>Role</span>
              <strong>{session.user.role}</strong>
            </div>
            <div className="info-chip">
              <span>KYC</span>
              <strong>{session.user.kycStatus}</strong>
            </div>
            <div className="info-chip">
              <span>Email</span>
              <strong>{session.user.email}</strong>
            </div>
          </div>

          <div className="dashboard-view-switch" role="tablist" aria-label="Workspace view">
            <button
              type="button"
              className={activeTab === 'overview' ? 'view-button active' : 'view-button'}
              onClick={() => setActiveTab('overview')}
            >
              Overview
            </button>
            <button
              type="button"
              className={activeTab === 'account' ? 'view-button active' : 'view-button'}
              onClick={() => setActiveTab('account')}
            >
              Account
            </button>
            {session.user.role === 'lender' ? (
              <>
                <button
                  type="button"
                  className={activeTab === 'kyc' ? 'view-button active' : 'view-button'}
                  onClick={() => setActiveTab('kyc')}
                >
                  KYC
                </button>
                <button
                  type="button"
                  className={activeTab === 'legal' ? 'view-button active' : 'view-button'}
                  onClick={() => setActiveTab('legal')}
                >
                  Legal
                </button>
              </>
            ) : null}
          </div>
        </section>

        {dashboardError && currentDashboard ? (
          <section className="dashboard-panel">
            <div className="message-banner error">{dashboardError}</div>
          </section>
        ) : null}

        {dashboardLoading && !currentDashboard ? (
          <section className="dashboard-panel">
            <div className="section-header">
              <h2>Loading workspace</h2>
              <p>Fetching your latest platform data from Firestore.</p>
            </div>
          </section>
        ) : null}

        {dashboardError && !currentDashboard ? (
          <section className="dashboard-panel">
            <div className="message-banner error">{dashboardError}</div>
            <button
              className="primary-button"
              type="button"
              onClick={() => void loadDashboard(session.accessToken)}
            >
              Retry workspace load
            </button>
          </section>
        ) : null}

        {currentDashboard ? (
          <>
            {activeTab === 'overview' ? (
              <>
                <section className="metrics-grid">
                  {currentDashboard.metrics.map((metric) => (
                    <article key={metric.label} className="metric-card">
                      <span>{metric.label}</span>
                      <strong>{metric.value}</strong>
                      <p>{metric.helper}</p>
                    </article>
                  ))}
                </section>

                <section className="dashboard-columns">
                  <section className="dashboard-panel">
                    <div className="section-header">
                      <h2>{currentDashboard.primaryListTitle}</h2>
                      <p>Live records pulled from your current Firestore data.</p>
                    </div>

                    <div className="activity-list">
                      {currentDashboard.primaryList.length > 0 ? (
                        currentDashboard.primaryList.map((item) => (
                          <DashboardItem key={item.id} item={item} />
                        ))
                      ) : (
                        <EmptyState message="No records available yet for this section." />
                      )}
                    </div>
                  </section>

                  <section className="dashboard-panel">
                    <div className="section-header">
                      <h2>{currentDashboard.secondaryListTitle}</h2>
                      <p>Helpful counterpart and relationship snapshots for this role.</p>
                    </div>

                    <div className="activity-list">
                      {currentDashboard.secondaryList.length > 0 ? (
                        currentDashboard.secondaryList.map((item) => (
                          <DashboardItem key={item.id} item={item} />
                        ))
                      ) : (
                        <EmptyState message="No relationships available yet for this section." />
                      )}
                    </div>
                  </section>
                </section>
              </>
            ) : activeTab === 'account' ? (
              <section className="dashboard-columns account-columns">
                <section className="dashboard-panel">
                  <div className="section-header">
                    <h2>Profile</h2>
                    <p>Core identity details from your authenticated Firestore user record.</p>
                  </div>

                  <div className="detail-list">
                    <DetailRow label="Full name" value={session.user.fullName} />
                    <DetailRow label="User ID" value={session.user.uid} />
                    <DetailRow label="Email" value={session.user.email} />
                    <DetailRow label="Phone" value={session.user.phone} />
                    <DetailRow label="Role" value={session.user.role} />
                  </div>
                </section>

                <section className="dashboard-panel">
                  <div className="section-header">
                    <h2>Account Status</h2>
                    <p>Live session details from `GET /api/auth/session`.</p>
                  </div>

                  <div className="detail-list">
                    <DetailRow
                      label="Session"
                      value={sessionStatus?.message ?? 'Authenticated'}
                    />
                    <DetailRow
                      label="Active role"
                      value={sessionStatus?.activeRole ?? session.user.role}
                    />
                    <DetailRow
                      label="Available roles"
                      value={sessionStatus?.availableRoles.join(', ') ?? session.user.role}
                    />
                    <DetailRow
                      label="Account status"
                      value={sessionStatus?.accountStatus ?? 'active'}
                    />
                    <DetailRow
                      label="KYC status"
                      value={sessionStatus?.kycStatus ?? session.user.kycStatus}
                    />
                  </div>
                </section>

                <section className="dashboard-panel">
                  <div className="section-header">
                    <h2>Route Access</h2>
                    <p>Quick view of the routes this website session can use.</p>
                  </div>

                  <div className="activity-list compact-list">
                    <RouteItem
                      path="/api/auth/session"
                      status="allowed"
                      note="Any authenticated website token."
                    />
                    <RouteItem
                      path="/api/auth/lender/dashboard"
                      status={
                        (sessionStatus?.activeRole ?? session.user.role) === 'lender'
                          ? 'allowed'
                          : 'blocked'
                      }
                      note="Lender website route."
                    />
                    <RouteItem
                      path="/api/auth/admin/dashboard"
                      status={
                        (sessionStatus?.activeRole ?? session.user.role) === 'admin'
                          ? 'allowed'
                          : 'blocked'
                      }
                      note="Admin website route."
                    />
                  </div>
                </section>
              </section>
            ) : activeTab === 'kyc' ? (
              <section className="dashboard-panel">
                <div className="section-header">
                  <h2>KYC Verification</h2>
                  <p>Upload identity documents and track the lender verification review separately from legal workflows.</p>
                </div>

                <KycSubmissionForm accessToken={session.accessToken} />
              </section>
            ) : (
              <section className="dashboard-panel">
                <div className="section-header">
                  <h2>Legal Documents</h2>
                  <p>
                    Agreements are created once the loan record exists after application acceptance. Load the loan agreement, sign it digitally, and download the final PDF.
                  </p>
                </div>

                <LegalDocumentPanel
                  accessToken={session.accessToken}
                  activeRole={sessionStatus?.activeRole ?? session.user.role}
                />
              </section>
            )}
          </>
        ) : null}
      </main>
    );
  }

  return (
    <main className="page-shell web-auth-shell">
      <section className="hero-panel web-hero-panel">
        <div>
          <div className="brand-lockup">
            <div className="brand-mark">SC</div>
            <div>
              <strong>Smart Credit+</strong>
              <p>{isAdminPortal ? 'Admin website' : 'Lender website'}</p>
            </div>
          </div>
        </div>

        <div>
          <h1 className="hero-title">
            {isAdminPortal ? (
              <>
                The future of
                <span> peer-to-peer lending</span>
                <br />
                is here.
              </>
            ) : (
              <>
                Grow your lending
                <span> business online</span>
                <br />
                with verified borrowers.
              </>
            )}
          </h1>
          <p className="hero-copy">
            {isAdminPortal
              ? 'Manage the platform with full control, review KYC status, and monitor activity in real time.'
              : 'Create your lender account, complete KYC during sign-up, and manage agreements and relationships from the web.'}
          </p>

          <div className="hero-stat-row">
            <div className="hero-stat-card">
              <strong>API</strong>
              <span>Live backend</span>
            </div>
            <div className="hero-stat-card">
              <strong>JWT</strong>
              <span>Secure access</span>
            </div>
            <div className="hero-stat-card">
              <strong>24/7</strong>
              <span>Monitoring</span>
            </div>
          </div>
        </div>
      </section>

      <section className="auth-panel auth-card-panel">
        <div className="auth-content-stack">
          {!roleSelection ? (
            <>
              <div className="heading-block auth-heading-block">
                <h2>Choose your login type</h2>
                <p>Select whether you're an admin or a lender to proceed with sign in or registration.</p>
              </div>
              <div className="role-selection" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.5rem' }}>
                <button
                  type="button"
                  className={roleSelection === 'admin' ? 'role-button active' : 'role-button'}
                  onClick={() => {
                    setRoleSelection('admin');
                    setMode('login');
                    resetMessages();
                  }}
                  style={{
                    padding: '1rem',
                    border: '2px solid #e0e0e0',
                    borderRadius: '8px',
                    backgroundColor: '#fff',
                    cursor: 'pointer',
                    fontSize: '1rem',
                    fontWeight: '500',
                    transition: 'all 0.2s',
                  }}
                >
                  Admin
                </button>
                <button
                  type="button"
                  className={roleSelection === 'lender' ? 'role-button active' : 'role-button'}
                  onClick={() => {
                    setRoleSelection('lender');
                    setMode('login');
                    resetMessages();
                  }}
                  style={{
                    padding: '1rem',
                    border: '2px solid #e0e0e0',
                    borderRadius: '8px',
                    backgroundColor: '#fff',
                    cursor: 'pointer',
                    fontSize: '1rem',
                    fontWeight: '500',
                    transition: 'all 0.2s',
                  }}
                >
                  Lender
                </button>
              </div>
            </>
          ) : (
            <>
              <div className="heading-block auth-heading-block">
                <h2>{mode === 'login' ? `${roleSelection.charAt(0).toUpperCase() + roleSelection.slice(1)} Sign In` : `Create ${roleSelection.charAt(0).toUpperCase() + roleSelection.slice(1)} Account`}</h2>
                <p>
                  {mode === 'login'
                    ? `Sign in to your ${roleSelection} account.`
                    : `Create your ${roleSelection} account.`}
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setRoleSelection(null);
                    resetMessages();
                  }}
                  style={{
                    marginTop: '0.5rem',
                    padding: '0.25rem 0.5rem',
                    background: 'none',
                    border: 'none',
                    color: '#0066cc',
                    cursor: 'pointer',
                    textDecoration: 'underline',
                    fontSize: '0.9rem',
                  }}
                >
                  ← Change login type
                </button>
              </div>

              {roleSelection === 'lender' ? (
                <div className="mode-switch auth-mode-switch" role="tablist" aria-label="Authentication mode">
                  <button
                    type="button"
                    className={mode === 'login' ? 'mode-button active' : 'mode-button'}
                    onClick={() => {
                      setMode('login');
                      resetMessages();
                    }}
                  >
                    Sign In
                  </button>
                  <button
                    type="button"
                    className={mode === 'register' ? 'mode-button active' : 'mode-button'}
                    onClick={() => {
                      setMode('register');
                      resetMessages();
                    }}
                  >
                    Create Account
                  </button>
                </div>
              ) : null}
            </>
          )}

          {infoMessage ? <div className="message-banner success">{infoMessage}</div> : null}
          {apiError ? <div className="message-banner error">{apiError}</div> : null}

          {roleSelection && (roleSelection === 'admin' || mode === 'login') ? (
            <form className="auth-form" onSubmit={handleLogin}>
              <label className="field">
                <span>{roleSelection === 'admin' ? 'Email address' : 'Email or phone'}</span>
                <input
                  value={loginForm.identifier}
                  onChange={(event) =>
                    setLoginForm((current) => ({
                      ...current,
                      identifier: event.target.value,
                    }))
                  }
                  placeholder={
                    roleSelection === 'admin'
                      ? 'admin@smartcredit.lk'
                      : 'lender@example.com or +94 77 123 4567'
                  }
                />
                {fieldErrors.identifier ? <small>{fieldErrors.identifier}</small> : null}
              </label>

              <label className="field">
                <div className="field-label-row">
                  <span>Password</span>
                  {roleSelection === 'admin' ? <button type="button" className="inline-link-button">Forgot password?</button> : null}
                </div>
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
                />
                {fieldErrors.password ? <small>{fieldErrors.password}</small> : null}
              </label>

              <button className="primary-button auth-submit-button" type="submit" disabled={loading}>
                {loading ? 'Signing in...' : 'Sign In'}
              </button>
            </form>
          ) : (
            <form className="auth-form lender-register-form" onSubmit={handleRegister}>
              <div className="form-section-header">
                <h3>Account details</h3>
                <p>These details create the lender account in the `users` collection.</p>
              </div>

              <div className="two-column-grid">
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
                          fullName: current.kyc.fullName || event.target.value,
                        },
                      }))
                    }
                    placeholder="Nimal Perera"
                  />
                  {fieldErrors.fullName ? <small>{fieldErrors.fullName}</small> : null}
                </label>

                <label className="field">
                  <span>Email</span>
                  <input
                    value={registerForm.email}
                    onChange={(event) =>
                      setRegisterForm((current) => ({
                        ...current,
                        email: event.target.value,
                      }))
                    }
                    placeholder="lender@example.com"
                  />
                  {fieldErrors.email ? <small>{fieldErrors.email}</small> : null}
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
                  />
                  {fieldErrors.phone ? <small>{fieldErrors.phone}</small> : null}
                </label>

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
                    placeholder="At least 8 characters"
                  />
                  {fieldErrors.password ? <small>{fieldErrors.password}</small> : null}
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
                    placeholder="Repeat your password"
                  />
                  {fieldErrors.confirmPassword ? <small>{fieldErrors.confirmPassword}</small> : null}
                </label>
              </div>

              <div className="form-section-header">
                <h3>KYC verification</h3>
                <p>Lenders must complete KYC during sign-up before entering the website.</p>
              </div>

              <div className="two-column-grid">
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
                  >
                    <option value="national_id">National ID</option>
                    <option value="passport">Passport</option>
                    <option value="drivers_license">Driver&apos;s license</option>
                  </select>
                </label>

                <label className="field">
                  <span>Document number</span>
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
                    placeholder="Enter document number"
                  />
                  {fieldErrors.documentNumber ? <small>{fieldErrors.documentNumber}</small> : null}
                </label>

                <label className="field">
                  <span>Full name on document</span>
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
                    placeholder="Name exactly as shown on the document"
                  />
                  {fieldErrors.kycFullName ? <small>{fieldErrors.kycFullName}</small> : null}
                </label>

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
                  />
                </label>
              </div>

            <div className="three-column-grid">
              <label className="field">
                <span>Document front image</span>
                <input
                  type="file"
                  accept="image/*,.pdf"
                  onChange={(event) =>
                    void handleRegisterFileUpload(
                      'documentFrontUrl',
                      event.target.files?.[0] ?? null,
                    )
                  }
                />
                {registerUploadStatus.documentFrontUrl ? (
                  <small className="upload-success-text">{registerUploadStatus.documentFrontUrl}</small>
                ) : null}
                {fieldErrors.documentFrontUrl ? <small>{fieldErrors.documentFrontUrl}</small> : null}
              </label>

              <label className="field">
                <span>Document back image</span>
                <input
                  type="file"
                  accept="image/*,.pdf"
                  onChange={(event) =>
                    void handleRegisterFileUpload(
                      'documentBackUrl',
                      event.target.files?.[0] ?? null,
                    )
                  }
                />
                {registerUploadStatus.documentBackUrl ? (
                  <small className="upload-success-text">{registerUploadStatus.documentBackUrl}</small>
                ) : null}
              </label>

              <label className="field">
                <span>Selfie with document</span>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(event) =>
                    void handleRegisterFileUpload(
                      'selfieUrl',
                      event.target.files?.[0] ?? null,
                    )
                  }
                />
                {registerUploadStatus.selfieUrl ? (
                  <small className="upload-success-text">{registerUploadStatus.selfieUrl}</small>
                ) : null}
                {fieldErrors.selfieUrl ? <small>{fieldErrors.selfieUrl}</small> : null}
              </label>
            </div>

              <button className="primary-button auth-submit-button" type="submit" disabled={loading}>
                {loading ? 'Creating account...' : 'Create lender account'}
              </button>
            </form>
          )}
        </div>
      </section>

      <AgreementModal
        isOpen={showAgreementModal}
        onClose={() => setShowAgreementModal(false)}
        onAccept={handleAgreementAccept}
        title="Smart Credit+ Terms and Conditions"
        pdfUrl="https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf"
      />
    </main>
  );
}

function DashboardItem({ item }: { item: DashboardListItem }) {
  return (
    <article className="activity-card">
      <div className="activity-main">
        <h3>{item.title}</h3>
        <p>{item.subtitle}</p>
      </div>
      <div className="activity-meta">
        <span>{item.meta}</span>
        <strong>{item.status}</strong>
      </div>
    </article>
  );
}

function EmptyState({ message }: { message: string }) {
  return <div className="empty-state">{message}</div>;
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="detail-row">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function RouteItem({
  path,
  status,
  note,
}: {
  path: string;
  status: 'allowed' | 'blocked';
  note: string;
}) {
  return (
    <article className="route-card">
      <div className="activity-main">
        <h3>{path}</h3>
        <p>{note}</p>
      </div>
      <div className="activity-meta">
        <strong className={status === 'allowed' ? 'status-chip allow' : 'status-chip block'}>
          {status}
        </strong>
      </div>
    </article>
  );
}
