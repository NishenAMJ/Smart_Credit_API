export type LenderSession = {
  lenderId: string;
  displayName: string;
  email: string;
  accessToken: string;
};

const SESSION_STORAGE_KEY = "smart-credit:lender-session";
const ACCOUNTS_STORAGE_KEY = "smart-credit:lender-accounts";

function canUseStorage(): boolean {
  return (
    typeof window !== "undefined" && typeof window.localStorage !== "undefined"
  );
}

function safeParseAccounts(value: string | null): LenderSession[] {
  if (!value) {
    return [];
  }

  try {
    const parsed = JSON.parse(value) as unknown;

    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed.filter((item): item is LenderSession => {
      if (!item || typeof item !== "object") {
        return false;
      }

      const candidate = item as Partial<LenderSession>;
      return (
        typeof candidate.lenderId === "string" &&
        typeof candidate.displayName === "string" &&
        typeof candidate.email === "string" &&
        typeof candidate.accessToken === "string" &&
        candidate.accessToken.trim().length > 0
      );
    });
  } catch {
    return [];
  }
}

function readStoredAccounts(): LenderSession[] {
  if (!canUseStorage()) {
    return [];
  }

  return safeParseAccounts(window.localStorage.getItem(ACCOUNTS_STORAGE_KEY));
}

function writeStoredAccounts(accounts: LenderSession[]) {
  if (!canUseStorage()) {
    return;
  }

  window.localStorage.setItem(ACCOUNTS_STORAGE_KEY, JSON.stringify(accounts));
}

export function getStoredSession(): LenderSession | null {
  if (!canUseStorage()) {
    return null;
  }

  const rawSession = window.localStorage.getItem(SESSION_STORAGE_KEY);

  if (!rawSession) {
    return null;
  }

  const [session] = safeParseAccounts(`[${rawSession}]`);
  return session ?? null;
}

export function getSessionFromSearchParams(): LenderSession | null {
  if (typeof window === "undefined") {
    return null;
  }

  const params = new URLSearchParams(window.location.search);
  const lenderId = params.get("lenderId");
  const displayName = params.get("displayName");
  const email = params.get("email");
  const accessToken = params.get("accessToken");
  const hasLegacyHandoffParams =
    params.has("lenderId") ||
    params.has("displayName") ||
    params.has("email") ||
    params.has("accessToken");

  if (hasLegacyHandoffParams) {
    params.delete("lenderId");
    params.delete("displayName");
    params.delete("email");
    params.delete("accessToken");

    const nextSearch = params.toString();
    const nextUrl = `${window.location.pathname}${
      nextSearch ? `?${nextSearch}` : ""
    }${window.location.hash}`;

    window.history.replaceState({}, document.title, nextUrl);
  }

  if (!lenderId || !displayName || !accessToken) {
    return null;
  }

  return {
    lenderId,
    displayName,
    email: email ?? "",
    accessToken,
  };
}

export function setStoredSession(session: LenderSession) {
  if (!canUseStorage()) {
    return;
  }

  window.localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(session));
}

export function clearStoredSession() {
  if (!canUseStorage()) {
    return;
  }

  window.localStorage.removeItem(SESSION_STORAGE_KEY);
}

export function updateStoredSession(session: LenderSession) {
  setStoredSession(session);

  const existingAccounts = readStoredAccounts();
  const nextAccounts = existingAccounts.filter(
    (account) => account.lenderId !== session.lenderId,
  );

  nextAccounts.unshift(session);
  writeStoredAccounts(nextAccounts);
}
