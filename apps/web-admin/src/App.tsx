import { useEffect, useMemo, useState } from 'react';
import type { FormEvent } from 'react';

import { ApiError, authApi } from './api';
import type {
  AuthMode,
  DashboardListItem,
  DashboardResponse,
  RegisterPayload,
  SessionResponse,
  StoredSession,
  UserRole,
} from './types';

const STORAGE_KEY = 'smart-credit-auth-session';

type LoginFormState = {
  identifier: string;
  password: string;
  role: UserRole;
};

type RegisterFormState = {
  fullName: string;
  email: string;
  phone: string;
  password: string;
  confirmPassword: string;
  role: UserRole;
};

type DashboardTab = 'overview' | 'account';

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
  role: 'borrower',
};

const initialRegisterForm: RegisterFormState = {
  fullName: '',
  email: '',
  phone: '',
  password: '',
  confirmPassword: '',
  role: 'borrower',
};

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

  useEffect(() => {
    if (!session) {
      localStorage.removeItem(STORAGE_KEY);
      return;
    }

    localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
  }, [session]);

  const activeRole = useMemo(
    () => (mode === 'login' ? loginForm.role : registerForm.role),
    [loginForm.role, mode, registerForm.role],
  );

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
          : 'We could not load your dashboard right now.',
      );
    } finally {
      setDashboardLoading(false);
    }
  }

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

  function updateRole(role: UserRole) {
    if (mode === 'login') {
      setLoginForm((current) => ({ ...current, role }));
      return;
    }

    setRegisterForm((current) => ({ ...current, role }));
  }

  function resetMessages() {
    setFieldErrors({});
    setApiError('');
    setInfoMessage('');
  }

  function validateLogin(): boolean {
    const errors: Record<string, string> = {};

    if (!loginForm.identifier.trim()) {
      errors.identifier = 'Email or phone is required.';
    }

    if (!loginForm.password.trim()) {
      errors.password = 'Password is required.';
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

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  }

  async function handleRegister(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    resetMessages();

    if (!validateRegister()) {
      return;
    }

    const payload: RegisterPayload = {
      fullName: registerForm.fullName.trim(),
      email: registerForm.email.trim(),
      phone: registerForm.phone.trim(),
      password: registerForm.password,
      role: registerForm.role,
    };

    try {
      setLoading(true);
      const response = await authApi.register(payload);

      setInfoMessage(response.message);
      setMode('login');
      setRegisterForm(initialRegisterForm);
      setLoginForm({
        identifier: payload.email,
        password: '',
        role: payload.role,
      });
    } catch (error) {
      setApiError(
        error instanceof Error ? error.message : 'Registration failed.',
      );
    } finally {
      setLoading(false);
    }
  }

  async function handleLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    resetMessages();

    if (!validateLogin()) {
      return;
    }

    try {
      setLoading(true);
      const response = await authApi.login(loginForm);
      setActiveTab('overview');
      setSession({
        accessToken: response.accessToken,
        user: response.user,
      });
    } catch (error) {
      setApiError(error instanceof Error ? error.message : 'Login failed.');
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
              <div className="panel-badge">Smart Credit+ Workspace</div>
              <p className="dashboard-role-label">
                {session.user.role === 'borrower'
                  ? 'Borrower dashboard'
                  : 'Lender dashboard'}
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
              'Your workspace is loading. We are preparing your latest Firestore activity.'}
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
              <h2>Loading dashboard</h2>
              <p>Fetching your latest borrower/lender data from Firestore.</p>
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
              Retry dashboard load
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
                      <p>
                        Helpful counterpart and relationship snapshots for this role.
                      </p>
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
            ) : (
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
                    <p>Quick teammate-friendly view of the routes this token can use.</p>
                  </div>

                  <div className="activity-list compact-list">
                    <RouteItem
                      path="/api/auth/session"
                      status="allowed"
                      note="Any authenticated borrower or lender token."
                    />
                    <RouteItem
                      path="/api/auth/borrower/dashboard"
                      status={
                        (sessionStatus?.activeRole ?? session.user.role) === 'borrower'
                          ? 'allowed'
                          : 'blocked'
                      }
                      note="Borrower role only."
                    />
                    <RouteItem
                      path="/api/auth/lender/dashboard"
                      status={
                        (sessionStatus?.activeRole ?? session.user.role) === 'lender'
                          ? 'allowed'
                          : 'blocked'
                      }
                      note="Lender role only."
                    />
                  </div>
                </section>

                <section className="dashboard-panel">
                  <div className="section-header">
                    <h2>Developer Notes</h2>
                    <p>Useful handoff details for the rest of the group project.</p>
                  </div>

                  <div className="detail-list">
                    <DetailRow
                      label="Auth header"
                      value="Authorization: Bearer <accessToken>"
                    />
                    <DetailRow
                      label="Workspace key"
                      value="smart-credit-auth-session"
                    />
                    <DetailRow
                      label="Postman docs"
                      value="apps/backend/Smart_Credit_Auth.postman_collection.json"
                    />
                    <DetailRow label="Written guide" value="docs/auth-api.md" />
                  </div>
                </section>
              </section>
            )}
          </>
        ) : null}
      </main>
    );
  }

  return (
    <main className="page-shell">
      <section className="hero-panel">
        <div className="panel-badge">Smart Credit+ MVP</div>
        <h1 className="hero-title">Secure access for borrowers and lenders</h1>
        <p className="hero-copy">
          This first version creates accounts in Firestore, logs users in through
          the NestJS API, and keeps the role-based flow simple for your team demo.
        </p>

        <div className="hero-points">
          <div className="hero-point">Register through the backend</div>
          <div className="hero-point">Store users in Firestore</div>
          <div className="hero-point">Issue JWT on login</div>
        </div>
      </section>

      <section className="auth-panel">
        <div className="mode-switch" role="tablist" aria-label="Authentication mode">
          <button
            type="button"
            className={mode === 'login' ? 'mode-button active' : 'mode-button'}
            onClick={() => {
              setMode('login');
              resetMessages();
            }}
          >
            Login
          </button>
          <button
            type="button"
            className={mode === 'register' ? 'mode-button active' : 'mode-button'}
            onClick={() => {
              setMode('register');
              resetMessages();
            }}
          >
            Register
          </button>
        </div>

        <div className="role-switch" aria-label="Role selection">
          {(['borrower', 'lender'] as UserRole[]).map((role) => (
            <button
              key={role}
              type="button"
              className={activeRole === role ? 'role-button active' : 'role-button'}
              onClick={() => updateRole(role)}
            >
              {role}
            </button>
          ))}
        </div>

        <div className="heading-block">
          <h2>{mode === 'login' ? 'Welcome back' : 'Create your account'}</h2>
          <p>
            {mode === 'login'
              ? 'Sign in with your email or phone and confirm your role.'
              : 'Register as a borrower or lender and store your profile in Firestore.'}
          </p>
        </div>

        {infoMessage ? <div className="message-banner success">{infoMessage}</div> : null}
        {apiError ? <div className="message-banner error">{apiError}</div> : null}

        {mode === 'login' ? (
          <form className="auth-form" onSubmit={handleLogin}>
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
                placeholder="you@example.com or +94 77 123 4567"
              />
              {fieldErrors.identifier ? (
                <small>{fieldErrors.identifier}</small>
              ) : null}
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
              />
              {fieldErrors.password ? <small>{fieldErrors.password}</small> : null}
            </label>

            <button className="primary-button" type="submit" disabled={loading}>
              {loading ? 'Signing in...' : 'Log in'}
            </button>
          </form>
        ) : (
          <form className="auth-form" onSubmit={handleRegister}>
            <label className="field">
              <span>Full name</span>
              <input
                value={registerForm.fullName}
                onChange={(event) =>
                  setRegisterForm((current) => ({
                    ...current,
                    fullName: event.target.value,
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
                placeholder="nimal@example.com"
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
              {fieldErrors.confirmPassword ? (
                <small>{fieldErrors.confirmPassword}</small>
              ) : null}
            </label>

            <button className="primary-button" type="submit" disabled={loading}>
              {loading ? 'Creating account...' : 'Create account'}
            </button>
          </form>
        )}
      </section>
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
