const TOKEN_KEY = "adminToken";
const USER_KEY = "adminUser";

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
