export type LenderSession = {
  lenderId: string
  displayName: string
  email: string
  accessToken: string
}

const SESSION_STORAGE_KEY = 'smart-credit:lender-session'
const ACCOUNTS_STORAGE_KEY = 'smart-credit:lender-accounts'
const SHARED_SESSION_STORAGE_KEY = 'smart-credit-shared-auth-session'
const LEGACY_AUTH_PARAMS = ['accessToken', 'lenderId', 'displayName', 'email']

function canUseStorage(): boolean {
  return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined'
}

function safeParseAccounts(value: string | null): LenderSession[] {
  if (!value) {
    return []
  }

  try {
    const parsed = JSON.parse(value) as unknown

    if (!Array.isArray(parsed)) {
      return []
    }

    return parsed.filter((item): item is LenderSession => {
      if (!item || typeof item !== 'object') {
        return false
      }

      const candidate = item as Partial<LenderSession>
      return (
        typeof candidate.lenderId === 'string' &&
        typeof candidate.displayName === 'string' &&
        typeof candidate.email === 'string' &&
        typeof candidate.accessToken === 'string' &&
        candidate.accessToken.length > 0
      )
    })
  } catch {
    return []
  }
}

export function getStoredSession(): LenderSession | null {
  if (!canUseStorage()) {
    return null
  }

  const rawSession = window.localStorage.getItem(SESSION_STORAGE_KEY)

  if (!rawSession) {
    return null
  }

  const [session] = safeParseAccounts(`[${rawSession}]`)
  return session ?? null
}

export function setStoredSession(session: LenderSession) {
  if (!canUseStorage()) {
    return
  }

  window.localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(session))
}

export function clearStoredSession() {
  if (!canUseStorage()) {
    return
  }

  window.localStorage.removeItem(SESSION_STORAGE_KEY)
  window.localStorage.removeItem(ACCOUNTS_STORAGE_KEY)
  window.localStorage.removeItem(SHARED_SESSION_STORAGE_KEY)
}

export function updateStoredSession(session: LenderSession) {
  setStoredSession(session)
  window.localStorage.removeItem(ACCOUNTS_STORAGE_KEY)
}

export function removeLegacyAuthParams() {
  if (typeof window === 'undefined') {
    return
  }

  const url = new URL(window.location.href)
  const hadLegacyParams = LEGACY_AUTH_PARAMS.some((key) =>
    url.searchParams.has(key),
  )

  if (!hadLegacyParams) {
    return
  }

  LEGACY_AUTH_PARAMS.forEach((key) => url.searchParams.delete(key))
  window.history.replaceState(
    window.history.state,
    '',
    `${url.pathname}${url.search}${url.hash}`,
  )
}
