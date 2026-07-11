const TOKEN_KEY = "adminToken";
const USER_KEY = "adminUser";
const LENDER_SESSION_KEY = "smart-credit:lender-session";
const LENDER_ACCOUNTS_KEY = "smart-credit:lender-accounts";

export type SharedAuthUser = {
  uid: string;
  fullName: string;
  email: string;
  phone: string;
  role: "admin" | "borrower" | "lender";
  kycStatus:
    | "not_submitted"
    | "pending"
    | "under_review"
    | "approved"
    | "rejected";
};

type LenderSession = {
  lenderId: string;
  displayName: string;
  email: string;
  accessToken: string;
};

// Returns the currently stored admin access token, if one exists.
export function getAdminToken() {
  return localStorage.getItem(TOKEN_KEY);
}

// Persists the authenticated admin session for future page loads.
export function setAdminSession<T>(token: string, user: T) {
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(USER_KEY, JSON.stringify(user));
}

// Clears the locally stored admin session after logout or auth failure.
export function clearAdminSession() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
}

// Reads and parses the stored admin user payload.
export function getAdminUser<T>() {
  const value = localStorage.getItem(USER_KEY);

  if (!value) {
    return null as T | null;
  }

  try {
    return JSON.parse(value) as T;
  } catch {
    return null as T | null;
  }
}

function readLenderAccounts() {
  const value = localStorage.getItem(LENDER_ACCOUNTS_KEY);

  if (!value) {
    return [] as LenderSession[];
  }

  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? (parsed as LenderSession[]) : [];
  } catch {
    return [] as LenderSession[];
  }
}

export function setLenderSession(token: string, user: SharedAuthUser) {
  const session: LenderSession = {
    lenderId: user.uid,
    displayName: user.fullName,
    email: user.email,
    accessToken: token,
  };

  localStorage.setItem(LENDER_SESSION_KEY, JSON.stringify(session));

  const accounts = readLenderAccounts().filter(
    (account) => account.lenderId !== session.lenderId,
  );
  accounts.unshift(session);
  localStorage.setItem(LENDER_ACCOUNTS_KEY, JSON.stringify(accounts));
}

export function clearLenderSession() {
  localStorage.removeItem(LENDER_SESSION_KEY);
}
