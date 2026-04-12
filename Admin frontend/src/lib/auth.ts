const TOKEN_KEY = "adminToken";
const USER_KEY = "adminUser";

export function getAdminToken() {
  return localStorage.getItem(TOKEN_KEY);
}

export function setAdminSession(token: string, user: unknown) {
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(USER_KEY, JSON.stringify(user));
}

export function clearAdminSession() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
}

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
