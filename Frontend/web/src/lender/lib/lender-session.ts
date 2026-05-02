export type LenderSession = {
  lenderId: string
  displayName: string
  email: string
  accessToken: string
}

const SESSION_STORAGE_KEY = 'smart-credit:lender-session'
const ACCOUNTS_STORAGE_KEY = 'smart-credit:lender-accounts'

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
        typeof candidate.email === 'string'
      )
    })
  } catch {
    return []
  }
}



function readStoredAccounts(): LenderSession[] {
  if (!canUseStorage()) {
    return []
  }

  return safeParseAccounts(window.localStorage.getItem(ACCOUNTS_STORAGE_KEY))
}

function writeStoredAccounts(accounts: LenderSession[]) {
  if (!canUseStorage()) {
    return
  }

  window.localStorage.setItem(ACCOUNTS_STORAGE_KEY, JSON.stringify(accounts))
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
}

export function updateStoredSession(session: LenderSession) {
  setStoredSession(session)

  const existingAccounts = readStoredAccounts()
  const nextAccounts = existingAccounts.filter(
    (account) => account.lenderId !== session.lenderId,
  )

  nextAccounts.unshift(session)
  writeStoredAccounts(nextAccounts)
}

export function getSessionFromSearchParams(): LenderSession | null {
  if (typeof window === 'undefined') {
    return null
  }

  const searchParams = new URLSearchParams(window.location.search)
  const lenderId = searchParams.get('lenderId')
  const displayName = searchParams.get('displayName')
  const email = searchParams.get('email')
  const accessToken = searchParams.get('accessToken')

  if (!lenderId || !displayName || !email || !accessToken) {
    return null
  }

  const session: LenderSession = {
    lenderId,
    displayName,
    email,
    accessToken,
  }

  const nextUrl = new URL(window.location.href)
  nextUrl.searchParams.delete('lenderId')
  nextUrl.searchParams.delete('displayName')
  nextUrl.searchParams.delete('email')
  nextUrl.searchParams.delete('accessToken')
  window.history.replaceState({}, '', nextUrl.toString())

  return session
}

