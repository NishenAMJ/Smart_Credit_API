export type LenderSession = {
  lenderId: string
  displayName: string
  email: string
}

type LenderRegistrationInput = {
  lenderId: string
  displayName?: string
  email?: string
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

function normalizeLenderId(value: string): string {
  return value.trim()
}

function buildDisplayName(lenderId: string): string {
  const normalized = lenderId
    .trim()
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ')

  if (!normalized) {
    return 'Lender'
  }

  return normalized.replace(/\b\w/g, (character) => character.toUpperCase())
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

export function signInWithLenderId(lenderId: string): LenderSession {
  const normalizedLenderId = normalizeLenderId(lenderId)
  const storedAccount = readStoredAccounts().find(
    (account) => account.lenderId === normalizedLenderId,
  )

  const session =
    storedAccount ??
    ({
      lenderId: normalizedLenderId,
      displayName: buildDisplayName(normalizedLenderId),
      email: '',
    } satisfies LenderSession)

  setStoredSession(session)
  return session
}

export function registerTemporaryLender(
  input: LenderRegistrationInput,
): LenderSession {
  const lenderId = normalizeLenderId(input.lenderId)
  const displayName = input.displayName?.trim() || buildDisplayName(lenderId)
  const email = input.email?.trim() || ''

  const session: LenderSession = {
    lenderId,
    displayName,
    email,
  }

  const existingAccounts = readStoredAccounts()
  const nextAccounts = existingAccounts.filter(
    (account) => account.lenderId !== lenderId,
  )

  nextAccounts.unshift(session)
  writeStoredAccounts(nextAccounts)
  setStoredSession(session)

  return session
}
