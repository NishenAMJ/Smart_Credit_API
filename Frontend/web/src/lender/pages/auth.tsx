import { useState, type FormEvent } from 'react'
import { API_BASE_URL } from '../lib/api-config'
import type { LenderSession } from '../lib/lender-session'

type AuthPageProps = {
  onLogin: (session: LenderSession) => void
}

type LoginResponse = {
  accessToken: string
  user: {
    uid: string
    fullName: string
    email: string
    role: string
  }
}

async function parseLoginError(response: Response): Promise<string> {
  try {
    const body = (await response.json()) as { message?: string | string[] }
    return Array.isArray(body.message)
      ? body.message.join(', ')
      : body.message || 'Unable to sign in.'
  } catch {
    return 'Unable to sign in.'
  }
}

export default function AuthPage({ onLogin }: AuthPageProps) {
  const [identifier, setIdentifier] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (!identifier.trim() || !password) {
      setError('Enter your email or phone and password.')
      return
    }

    setError(null)
    setIsSubmitting(true)

    try {
      const response = await fetch(`${API_BASE_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          identifier: identifier.trim(),
          password,
          role: 'lender',
        }),
      })

      if (!response.ok) {
        throw new Error(await parseLoginError(response))
      }

      const data = (await response.json()) as LoginResponse

      if (data.user.role !== 'lender') {
        throw new Error('This account does not have lender access.')
      }

      onLogin({
        lenderId: data.user.uid,
        displayName: data.user.fullName,
        email: data.user.email,
        accessToken: data.accessToken,
      })
    } catch (loginError) {
      setError(
        loginError instanceof Error ? loginError.message : 'Unable to sign in.',
      )
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <main className="auth-shell">
      <section className="auth-card">
        <div className="auth-card__hero">
          <div className="auth-card__brand">
            <div className="auth-card__logo">SC</div>
            <div>
              <p className="auth-card__eyebrow">Lender access</p>
              <h1 className="auth-card__title">Sign in to Smart Credit</h1>
            </div>
          </div>
          <p className="auth-card__subtitle">
            Use your lender email or phone and password. Your portfolio is loaded
            using the authenticated lender account.
          </p>
        </div>

        <div className="auth-card__form-panel">
          {error ? <p className="auth-error">{error}</p> : null}

          <form className="auth-form" onSubmit={handleSubmit}>
            <label className="auth-field">
              <span className="auth-field__label">Email or phone</span>
              <input
                className="input"
                type="text"
                autoComplete="username"
                placeholder="kamal@smartcredit.lk"
                value={identifier}
                onChange={(event) => setIdentifier(event.target.value)}
              />
            </label>

            <label className="auth-field">
              <span className="auth-field__label">Password</span>
              <input
                className="input"
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
              />
            </label>

            <button type="submit" className="auth-submit" disabled={isSubmitting}>
              {isSubmitting ? 'Signing in...' : 'Sign in'}
            </button>
          </form>
        </div>
      </section>
    </main>
  )
}
