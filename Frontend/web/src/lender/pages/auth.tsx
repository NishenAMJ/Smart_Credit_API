import { useMemo, useState, type ChangeEvent, type FormEvent } from 'react'
import type { LenderSession } from '../lib/lender-session'
import {
  login,
  register,
  submitKyc,
  type SubmitKycPayload,
} from '../lib/auth-api'

type AuthMode = 'login' | 'signup'
type RegisterStep = 'account' | 'kyc'
type UploadFieldKey =
  | 'documentFrontUrl'
  | 'documentBackUrl'
  | 'selfieUrl'
  | 'profilePictureUrl'

type AuthPageProps = {
  onLogin: (session: LenderSession) => void
}

type SignUpForm = {
  fullName: string
  email: string
  phone: string
  password: string
  confirmPassword: string
  acceptedTerms: boolean
  kyc: SubmitKycPayload
}

const initialSignUpForm: SignUpForm = {
  fullName: '',
  email: '',
  phone: '',
  password: '',
  confirmPassword: '',
  acceptedTerms: false,
  kyc: {
    documentType: 'national_id',
    documentNumber: '',
    fullName: '',
    issuingCountry: 'Sri Lanka',
    expiryDate: '',
    documentFrontUrl: '',
    documentBackUrl: '',
    selfieUrl: '',
    profilePictureUrl: '',
  },
}

function getDocumentLabel(documentType: string) {
  switch (documentType) {
    case 'passport':
      return 'Passport'
    case 'driving_license':
      return 'License'
    default:
      return 'NIC'
  }
}

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () =>
      resolve(typeof reader.result === 'string' ? reader.result : '')
    reader.onerror = () => reject(new Error('Failed to read the selected file.'))
    reader.readAsDataURL(file)
  })
}

export default function AuthPage({ onLogin }: AuthPageProps) {
  const [activeMode, setActiveMode] = useState<AuthMode>('login')
  const [registerStep, setRegisterStep] = useState<RegisterStep>('account')
  const [loginIdentifier, setLoginIdentifier] = useState('')
  const [loginPassword, setLoginPassword] = useState('')
  const [signUpForm, setSignUpForm] = useState<SignUpForm>(initialSignUpForm)
  const [uploadStatus, setUploadStatus] = useState<
    Partial<Record<UploadFieldKey, string>>
  >({})
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const documentLabel = getDocumentLabel(signUpForm.kyc.documentType)
  const documentNumberLabel =
    signUpForm.kyc.documentType === 'passport'
      ? 'Passport number'
      : signUpForm.kyc.documentType === 'driving_license'
        ? 'License number'
        : 'NIC number'

  const authCopy = useMemo(() => {
    return activeMode === 'login'
      ? {
          eyebrow: 'Lender Access',
          title: 'Sign in to your lender account',
          subtitle:
            'Use your email or phone together with your password to manage your portfolio and borrower activity.',
          buttonLabel: 'Sign in',
        }
      : {
          eyebrow: 'Smart Credit Platform',
          title:
            registerStep === 'account'
              ? 'Join Smart Credit as a lender'
              : 'Complete your lender verification',
          subtitle:
            registerStep === 'account'
              ? 'Start with your account details, then continue to KYC so your lender access can be reviewed.'
              : 'Submit your identity details and required files to finish lender onboarding.',
          buttonLabel:
            registerStep === 'account' ? 'Continue to KYC' : 'Create account',
        }
  }, [activeMode, registerStep])

  function resetAuthMode(nextMode: AuthMode) {
    setActiveMode(nextMode)
    setError(null)
    if (nextMode === 'signup') {
      setRegisterStep('account')
    }
  }

  function validateAccountStep() {
    if (!signUpForm.fullName.trim()) {
      setError('Full name is required.')
      return false
    }

    if (!signUpForm.email.trim() || !/\S+@\S+\.\S+/.test(signUpForm.email.trim())) {
      setError('Enter a valid email address.')
      return false
    }

    if (!signUpForm.phone.trim()) {
      setError('Phone number is required.')
      return false
    }

    if (signUpForm.password.length < 8) {
      setError('Password must be at least 8 characters long.')
      return false
    }

    if (signUpForm.password !== signUpForm.confirmPassword) {
      setError('Passwords do not match.')
      return false
    }

    return true
  }

  function validateKycStep() {
    if (
      !signUpForm.kyc.documentNumber.trim() ||
      !signUpForm.kyc.fullName.trim()
    ) {
      setError(`Full name on the ID and ${documentLabel} number are required.`)
      return false
    }

    if (
      !signUpForm.kyc.documentFrontUrl?.trim() ||
      !signUpForm.kyc.selfieUrl?.trim()
    ) {
      setError(`${documentLabel} front file and selfie file are required for KYC.`)
      return false
    }

    if (!signUpForm.kyc.profilePictureUrl?.trim()) {
      setError('Profile picture is required.')
      return false
    }

    if (!signUpForm.acceptedTerms) {
      setError('Accept the terms before creating your account.')
      return false
    }

    return true
  }

  async function handleFileChange(
    field: UploadFieldKey,
    event: ChangeEvent<HTMLInputElement>,
  ) {
    const file = event.target.files?.[0]

    if (!file) {
      return
    }

    try {
      setError(null)
      const dataUrl = await readFileAsDataUrl(file)
      setSignUpForm((current) => ({
        ...current,
        kyc: {
          ...current.kyc,
          [field]: dataUrl,
        },
      }))
      setUploadStatus((current) => ({
        ...current,
        [field]: file.name,
      }))
    } catch (nextError) {
      setError(
        nextError instanceof Error ? nextError.message : 'File upload failed.',
      )
    } finally {
      event.target.value = ''
    }
  }

  async function handleLoginSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)

    if (!loginIdentifier.trim() || !loginPassword.trim()) {
      setError('Please enter your email or phone together with your password.')
      return
    }

    try {
      setLoading(true)
      const data = await login({
        identifier: loginIdentifier.trim(),
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
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : 'Login failed')
    } finally {
      setLoading(false)
    }
  }

  async function handleSignUpSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)

    if (registerStep === 'account') {
      if (!validateAccountStep()) {
        return
      }

      setRegisterStep('kyc')
      return
    }

    if (!validateAccountStep() || !validateKycStep()) {
      return
    }

    try {
      setLoading(true)

      await register({
        fullName: signUpForm.fullName.trim(),
        email: signUpForm.email.trim(),
        phone: signUpForm.phone.trim(),
        password: signUpForm.password,
        role: 'lender',
      })

      const data = await login({
        identifier: signUpForm.email.trim(),
        password: signUpForm.password,
      })

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
      })

      onLogin({
        lenderId: data.user.uid,
        displayName: data.user.fullName,
        email: data.user.email,
        accessToken: data.accessToken,
      })
    } catch (nextError) {
      setError(
        nextError instanceof Error ? nextError.message : 'Registration failed',
      )
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="auth-shell">
      <section className="auth-card">
        <div className="auth-card__hero">
          <div className="auth-card__hero-orb auth-card__hero-orb--large" />
          <div className="auth-card__hero-orb auth-card__hero-orb--small" />
          <div className="auth-card__brand">
            <div className="auth-card__logo">SC</div>
            <div>
              <p className="auth-card__eyebrow">{authCopy.eyebrow}</p>
              <h1 className="auth-card__title">{authCopy.title}</h1>
            </div>
          </div>
          <p className="auth-card__subtitle">{authCopy.subtitle}</p>

          <div className="auth-card__hero-chips">
            <span className="auth-card__hero-chip">Role-safe access</span>
            <span className="auth-card__hero-chip">KYC review ready</span>
            <span className="auth-card__hero-chip">Lender workspace</span>
          </div>

          <div className="auth-card__metrics">
            <div className="auth-card__metric">
              <strong>One lender workspace</strong>
              <span>Dashboard, analytics, requests, and profile access in one secure flow.</span>
            </div>
            <div className="auth-card__metric">
              <strong>Guided onboarding</strong>
              <span>Move from account setup to KYC without switching screens or losing context.</span>
            </div>
          </div>

          <div className="auth-card__highlights">
            <article className="auth-highlight">
              <strong>Secure access</strong>
              <span>Your account is protected by industry standard security.</span>
            </article>
            <article className="auth-highlight">
              <strong>Two-step onboarding</strong>
              <span>Account setup and KYC review happen in one guided flow.</span>
            </article>
            <article className="auth-highlight">
              <strong>Lender dashboard</strong>
              <span>Manage loans, applications, and borrower analytics in one place.</span>
            </article>
          </div>

          <div className="auth-card__journey">
            <div className="auth-card__journey-step">
              <span>1</span>
              <div>
                <strong>Account setup</strong>
                <p>Create your lender credentials.</p>
              </div>
            </div>
            <div className="auth-card__journey-step">
              <span>2</span>
              <div>
                <strong>KYC verification</strong>
                <p>Upload identity evidence for review.</p>
              </div>
            </div>
            <div className="auth-card__journey-step">
              <span>3</span>
              <div>
                <strong>Workspace access</strong>
                <p>Enter the lender dashboard after sign-in.</p>
              </div>
            </div>
          </div>
        </div>

        <div className="auth-card__form-panel">
          <div className="auth-form__topbar">
            <div>
              <p className="auth-form__eyebrow">
                {activeMode === 'login' ? 'Welcome back' : 'Onboarding'}
              </p>
              <h2 className="auth-form__title">
                {activeMode === 'login'
                  ? 'Sign in'
                  : registerStep === 'account'
                    ? 'Lender account setup'
                    : 'Lender KYC verification'}
              </h2>
              <p className="auth-form__subtitle">
                {activeMode === 'login'
                  ? 'Use the credentials linked to your lender account.'
                  : registerStep === 'account'
                    ? 'Start with your contact details and password.'
                    : 'Complete the final verification details before access is granted.'}
              </p>
            </div>
            {activeMode === 'signup' ? (
              <span className="auth-step-badge">
                {registerStep === 'account' ? 'Step 1/2' : 'Step 2/2'}
              </span>
            ) : null}
          </div>

          <div className="auth-tabs" role="tablist" aria-label="Auth mode">
            <button
              type="button"
              className={`auth-tab${activeMode === 'login' ? ' auth-tab--active' : ''}`}
              onClick={() => resetAuthMode('login')}
            >
              Login
            </button>
            <button
              type="button"
              className={`auth-tab${activeMode === 'signup' ? ' auth-tab--active' : ''}`}
              onClick={() => resetAuthMode('signup')}
            >
              Sign Up
            </button>
          </div>

          <div className="auth-card__form-content">
            {activeMode === 'signup' && registerStep === 'account' ? (
              <div className="auth-notice">
                <strong>Two-step sign up</strong>
                <span>Create your lender account first, then continue to a separate KYC review step.</span>
              </div>
            ) : null}

            {error ? <p className="auth-error">{error}</p> : null}

            {activeMode === 'login' ? (
              <form className="auth-form" onSubmit={handleLoginSubmit}>
              <div className="auth-form__card">
                <div className="auth-form__card-head">
                  <strong>Sign in details</strong>
                  <span>Enter your identity and password. The backend confirms your lender role after authentication.</span>
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

              <button type="submit" className="auth-submit" disabled={loading}>
                {loading ? 'Signing in...' : authCopy.buttonLabel}
              </button>

              <p className="auth-helper auth-helper--inline">
                Your lender role is confirmed after sign-in and your dashboard opens automatically.
              </p>
              </form>
            ) : (
              <form className="auth-form" onSubmit={handleSignUpSubmit}>
              <p className="auth-helper">
                {registerStep === 'account'
                  ? 'Start with the lender account details you will use to sign in later.'
                  : 'Finish KYC with clear files and matching identity details.'}
              </p>

              {registerStep === 'account' ? (
                <div className="auth-form__section">
                  <div className="auth-form__card">
                    <div className="auth-form__card-head">
                      <strong>Account details</strong>
                      <span>Use the same contact details and password you will sign in with later.</span>
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
                              fullName: current.kyc.fullName || event.target.value,
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
                      <span className="auth-field__label">Confirm password</span>
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
                </div>
              ) : (
                <>
                  <div className="auth-progress">
                    <span className="auth-progress__step auth-progress__step--complete">
                      Account
                    </span>
                    <span className="auth-progress__step auth-progress__step--active">
                      KYC
                    </span>
                  </div>

                  <div className="auth-form__section">
                    <div className="auth-form__card">
                      <div className="auth-form__card-head">
                        <strong>KYC verification</strong>
                        <span>Match the name on your ID and upload clear files for review.</span>
                      </div>

                      <div className="auth-highlight-card">
                        <strong>Before you submit</strong>
                        <span>Use a readable ID image, a clear selfie with the document, and a recent profile photo.</span>
                      </div>

                      <div className="auth-form__grid">
                      <label className="auth-field auth-field--full">
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
                          <option value="driving_license">Driving License</option>
                        </select>
                      </label>

                      <label className="auth-field">
                        <span className="auth-field__label">{documentNumberLabel}</span>
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

                      <label className="auth-field">
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
                        <span className="auth-field__label">Issuing country</span>
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

                      <div className="auth-upload-list">
                        <label className="auth-upload-card">
                          <span className="auth-field__label">{documentLabel} front</span>
                          <input
                            type="file"
                            accept="image/*,.pdf"
                            onChange={(event) =>
                              void handleFileChange('documentFrontUrl', event)
                            }
                            disabled={loading}
                          />
                          <small className="auth-upload-card__meta">
                            {uploadStatus.documentFrontUrl ?? 'No file selected yet'}
                          </small>
                        </label>

                        <label className="auth-upload-card">
                          <span className="auth-field__label">{documentLabel} back</span>
                          <input
                            type="file"
                            accept="image/*,.pdf"
                            onChange={(event) =>
                              void handleFileChange('documentBackUrl', event)
                            }
                            disabled={loading}
                          />
                          <small className="auth-upload-card__meta">
                            {uploadStatus.documentBackUrl ?? 'Optional'}
                          </small>
                        </label>

                        <label className="auth-upload-card">
                          <span className="auth-field__label">
                            Selfie with {documentLabel}
                          </span>
                          <input
                            type="file"
                            accept="image/*"
                            onChange={(event) => void handleFileChange('selfieUrl', event)}
                            disabled={loading}
                          />
                          <small className="auth-upload-card__meta">
                            {uploadStatus.selfieUrl ?? 'No file selected yet'}
                          </small>
                        </label>

                        <label className="auth-upload-card">
                          <span className="auth-field__label">Profile picture</span>
                          <input
                            type="file"
                            accept="image/*"
                            onChange={(event) =>
                              void handleFileChange('profilePictureUrl', event)
                            }
                            disabled={loading}
                          />
                          <small className="auth-upload-card__meta">
                            {uploadStatus.profilePictureUrl ?? 'No file selected yet'}
                          </small>
                        </label>
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
                          I agree to the platform terms and consent to identity verification.
                        </span>
                      </label>
                    </div>
                  </div>
                </>
              )}

              <div className="auth-form__actions">
                {registerStep === 'kyc' ? (
                  <button
                    type="button"
                    className="auth-secondary-button"
                    onClick={() => {
                      setRegisterStep('account')
                      setError(null)
                    }}
                    disabled={loading}
                  >
                    Back
                  </button>
                ) : null}

                <button type="submit" className="auth-submit" disabled={loading}>
                  {loading
                    ? registerStep === 'account'
                      ? 'Continuing...'
                      : 'Creating account...'
                    : authCopy.buttonLabel}
                </button>
              </div>
              </form>
            )}
          </div>
        </div>
      </section>
    </main>
  )
}
