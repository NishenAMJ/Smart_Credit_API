import { useMemo, useState, type FormEvent } from 'react'
import type { LenderSession } from '../lib/lender-session'

type AuthMode = 'login' | 'signup'

type AuthPageProps = {
  onLogin: (session: LenderSession) => void
  onSignUp: (session: LenderSession) => void
}

export default function AuthPage({ onLogin, onSignUp }: AuthPageProps) {
  const [activeMode, setActiveMode] = useState<AuthMode>('login')
  const [loginLenderId, setLoginLenderId] = useState('')
  const [signUpLenderId, setSignUpLenderId] = useState('')
  const [signUpName, setSignUpName] = useState('')
  const [signUpEmail, setSignUpEmail] = useState('')
  const [error, setError] = useState<string | null>(null)

  const authCopy = useMemo(() => {
    return activeMode === 'login'
      ? {
          eyebrow: 'Temporary lender access',
          title: 'Sign in with your lender ID',
          subtitle:
            'Use this temporary screen until the real auth service is ready. If this lender ID already exists locally, we will restore its basic profile.',
          buttonLabel: 'Enter lender workspace',
        }
      : {
          eyebrow: 'Quick onboarding',
          title: 'Create a temporary lender profile',
          subtitle:
            'This only stores a lightweight profile in your browser so we can keep building lender-scoped pages now.',
          buttonLabel: 'Create profile and continue',
        }
  }, [activeMode])

  function handleLoginSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    const normalizedLenderId = loginLenderId.trim()

    if (!normalizedLenderId) {
      setError('Enter a lender ID to continue.')
      return
    }

    setError(null)
    onLogin({
      lenderId: normalizedLenderId,
      displayName: normalizedLenderId,
      email: '',
    })
  }

  function handleSignUpSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    const normalizedLenderId = signUpLenderId.trim()

    if (!normalizedLenderId) {
      setError('Enter a lender ID to create the temporary profile.')
      return
    }

    setError(null)
    onSignUp({
      lenderId: normalizedLenderId,
      displayName: signUpName.trim(),
      email: signUpEmail.trim(),
    })
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
              <strong>Faster development</strong>
              <span>Enter with a lender ID and keep building the real lender flow.</span>
            </article>
            <article className="auth-highlight">
              <strong>Lender-scoped analytics</strong>
              <span>The signed-in lender ID becomes the data key for analytics requests.</span>
            </article>
            <article className="auth-highlight">
              <strong>Easy to replace later</strong>
              <span>This local session can be swapped with real auth when your partner finishes it.</span>
            </article>
          </div>
        </div>

        <div className="auth-card__form-panel">
          <div className="auth-tabs" role="tablist" aria-label="Temporary auth mode">
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
                <span className="auth-field__label">Lender ID</span>
                <input
                  className="input"
                  type="text"
                  placeholder="ex: lender_001"
                  value={loginLenderId}
                  onChange={(event) => setLoginLenderId(event.target.value)}
                />
              </label>

              <button type="submit" className="auth-submit">
                {authCopy.buttonLabel}
              </button>

              <p className="auth-helper">
                If this lender was already created locally, we reuse that profile.
                Otherwise, we still let you enter with the typed lender ID.
              </p>
            </form>
          ) : (
            <form className="auth-form" onSubmit={handleSignUpSubmit}>
              <label className="auth-field">
                <span className="auth-field__label">Lender ID</span>
                <input
                  className="input"
                  type="text"
                  placeholder="ex: lender_001"
                  value={signUpLenderId}
                  onChange={(event) => setSignUpLenderId(event.target.value)}
                />
              </label>

              <label className="auth-field">
                <span className="auth-field__label">Display Name</span>
                <input
                  className="input"
                  type="text"
                  placeholder="Smart Capital Lanka"
                  value={signUpName}
                  onChange={(event) => setSignUpName(event.target.value)}
                />
              </label>

              <label className="auth-field">
                <span className="auth-field__label">Email</span>
                <input
                  className="input"
                  type="email"
                  placeholder="lender@example.com"
                  value={signUpEmail}
                  onChange={(event) => setSignUpEmail(event.target.value)}
                />
              </label>

              <button type="submit" className="auth-submit">
                {authCopy.buttonLabel}
              </button>
            </form>
          )}
        </div>
      </section>
    </main>
  )
}
