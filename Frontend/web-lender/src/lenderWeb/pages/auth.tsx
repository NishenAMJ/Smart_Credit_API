import { useMemo, useState, type FormEvent } from 'react'
import type { LenderSession } from '../lib/lender-session'
import { login, register } from '../lib/auth-api'

type AuthMode = 'login' | 'signup'

type AuthPageProps = {
  onLogin: (session: LenderSession) => void
}

export default function AuthPage({ onLogin }: AuthPageProps) {
  const [activeMode, setActiveMode] = useState<AuthMode>('login')
  const [loginEmail, setLoginEmail] = useState('')
  const [loginPassword, setLoginPassword] = useState('')
  
  const [signUpName, setSignUpName] = useState('')
  const [signUpEmail, setSignUpEmail] = useState('')
  const [signUpPhone, setSignUpPhone] = useState('')
  const [signUpPassword, setSignUpPassword] = useState('')
  
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const authCopy = useMemo(() => {
    return activeMode === 'login'
      ? {
          eyebrow: 'Lender Access',
          title: 'Sign in to your lender account',
          subtitle: 'Enter your credentials to manage your loan portfolio.',
          buttonLabel: 'Sign in',
        }
      : {
          eyebrow: 'Lender Onboarding',
          title: 'Create your lender account',
          subtitle: 'Register your details to start lending on Smart Credit.',
          buttonLabel: 'Create account',
        }
  }, [activeMode])

  async function handleLoginSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)

    if (!loginEmail.trim() || !loginPassword.trim()) {
      setError('Please enter both email and password.')
      return
    }

    try {
      setLoading(true)
      const data = await login({
        identifier: loginEmail.trim(),
        password: loginPassword,
      })

      if (data.user.role !== 'lender' && data.user.role !== 'admin') {
        throw new Error('Access denied. This portal is for lenders only.')
      }

      onLogin({
        lenderId: data.user.uid,
        displayName: data.user.fullName,
        email: data.user.email,
        accessToken: data.accessToken,
      })
    } catch (err: any) {
      setError(err.message || 'Login failed')
    } finally {
      setLoading(false)
    }
  }

  async function handleSignUpSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)

    if (!signUpName.trim() || !signUpEmail.trim() || !signUpPassword.trim()) {
      setError('Please fill in all required fields.')
      return
    }

    try {
      setLoading(true)
      await register({
        fullName: signUpName.trim(),
        email: signUpEmail.trim(),
        phone: signUpPhone.trim(),
        password: signUpPassword,
        role: 'lender',
      })
      
      const data = await login({
        identifier: signUpEmail.trim(),
        password: signUpPassword,
      })

      onLogin({
        lenderId: data.user.uid,
        displayName: data.user.fullName,
        email: data.user.email,
        accessToken: data.accessToken,
      })
    } catch (err: any) {
      setError(err.message || 'Registration failed')
    } finally {
      setLoading(false)
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

          <div className="auth-card__highlights">
            <article className="auth-highlight">
              <strong>Secure access</strong>
              <span>Your account is protected by industry standard security.</span>
            </article>
            <article className="auth-highlight">
              <strong>Lender dashboard</strong>
              <span>Manage loans, applications, and borrower analytics in one place.</span>
            </article>
          </div>
        </div>

        <div className="auth-card__form-panel">
          <div className="auth-tabs" role="tablist" aria-label="Auth mode">
            <button
              type="button"
              className={`auth-tab${activeMode === 'login' ? ' auth-tab--active' : ''}`}
              onClick={() => {
                setActiveMode('login')
                setError(null)
              }}
            >
              Login
            </button>
            <button
              type="button"
              className={`auth-tab${activeMode === 'signup' ? ' auth-tab--active' : ''}`}
              onClick={() => {
                setActiveMode('signup')
                setError(null)
              }}
            >
              Sign Up
            </button>
          </div>

          {error ? <p className="auth-error">{error}</p> : null}

          {activeMode === 'login' ? (
            <form className="auth-form" onSubmit={handleLoginSubmit}>
              <label className="auth-field">
                <span className="auth-field__label">Email</span>
                <input
                  className="input"
                  type="email"
                  placeholder="name@example.com"
                  value={loginEmail}
                  onChange={(event) => setLoginEmail(event.target.value)}
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

              <button type="submit" className="auth-submit" disabled={loading}>
                {loading ? 'Signing in...' : authCopy.buttonLabel}
              </button>
            </form>
          ) : (
            <form className="auth-form" onSubmit={handleSignUpSubmit}>
              <label className="auth-field">
                <span className="auth-field__label">Full Name</span>
                <input
                  className="input"
                  type="text"
                  placeholder="Company Name / Your Name"
                  value={signUpName}
                  onChange={(event) => setSignUpName(event.target.value)}
                  disabled={loading}
                />
              </label>

              <label className="auth-field">
                <span className="auth-field__label">Email</span>
                <input
                  className="input"
                  type="email"
                  placeholder="name@example.com"
                  value={signUpEmail}
                  onChange={(event) => setSignUpEmail(event.target.value)}
                  disabled={loading}
                />
              </label>

              <label className="auth-field">
                <span className="auth-field__label">Phone</span>
                <input
                  className="input"
                  type="tel"
                  placeholder="+94 77 123 4567"
                  value={signUpPhone}
                  onChange={(event) => setSignUpPhone(event.target.value)}
                  disabled={loading}
                />
              </label>

              <label className="auth-field">
                <span className="auth-field__label">Password</span>
                <input
                  className="input"
                  type="password"
                  placeholder="Minimum 8 characters"
                  value={signUpPassword}
                  onChange={(event) => setSignUpPassword(event.target.value)}
                  disabled={loading}
                />
              </label>

              <button type="submit" className="auth-submit" disabled={loading}>
                {loading ? 'Creating account...' : authCopy.buttonLabel}
              </button>
            </form>
          )}
        </div>
      </section>
    </main>
  )
}
