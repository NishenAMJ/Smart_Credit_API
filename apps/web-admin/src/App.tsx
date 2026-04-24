import { useEffect, useMemo, useState } from 'react';
import type { FormEvent } from 'react';

import { authApi } from './api';
import type { AuthMode, RegisterPayload, StoredSession, UserRole } from './types';

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

  async function hydrateSession(accessToken: string) {
    try {
      const response = await authApi.me(accessToken);
      setSession({
        accessToken,
        user: response.user,
      });
    } catch {
      setSession(null);
      localStorage.removeItem(STORAGE_KEY);
    }
  }

  useEffect(() => {
    if (!session?.accessToken) {
      return;
    }

    void hydrateSession(session.accessToken);
  }, []);

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
    setSession(null);
    setLoginForm(initialLoginForm);
    setFieldErrors({});
    setApiError('');
    setInfoMessage('');
    setMode('login');
  }

  if (session) {
    return (
      <main className="page-shell">
        <section className="auth-panel success-panel">
          <div className="panel-badge">Smart Credit+ Auth MVP</div>
          <p className="success-role">
            As a {session.user.role}, you successfully logged in to the app.
          </p>
          <h1 className="panel-title">{session.user.fullName}</h1>
          <p className="panel-subtitle">
            Your session is active and ready for the next feature step.
          </p>

          <div className="success-grid">
            <div className="info-card">
              <span>Email</span>
              <strong>{session.user.email}</strong>
            </div>
            <div className="info-card">
              <span>Phone</span>
              <strong>{session.user.phone}</strong>
            </div>
            <div className="info-card">
              <span>Role</span>
              <strong>{session.user.role}</strong>
            </div>
            <div className="info-card">
              <span>KYC Status</span>
              <strong>{session.user.kycStatus}</strong>
            </div>
          </div>

          <button className="primary-button" type="button" onClick={handleLogout}>
            Log out
          </button>
        </section>
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
