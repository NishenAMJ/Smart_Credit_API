/**
 * api.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Base HTTP client used by all service files.
 *
 * BASE_URL points to your NestJS backend.
 * Physical device: use your PC's WiFi IP (ipconfig → Wi-Fi → IPv4).
 * Emulator:        use 10.0.2.2:3000 (Android) or localhost:3000 (iOS sim).
 *
 * TEMP AUTH:
 * Until real JWT login is built, every request sends 'lender_004' as the
 * x-user-id header. The backend's @CurrentUser() decorator reads this header
 * as a fallback when req.user.id is not set by a JWT guard.
 *
 * When real auth is ready:
 *   1. Store the JWT token after login (AsyncStorage / SecureStore)
 *   2. Replace getAuthHeaders() to return: { Authorization: `Bearer ${token}` }
 *   3. Add a JWT guard to the backend that populates req.user.id
 */

// ── Config ────────────────────────────────────────────────────────────────────

// Update this IP whenever your PC's WiFi IP changes.
// Run `ipconfig` on Windows or `ifconfig` on Mac/Linux to find it.
const BASE_URL = 'http://192.168.120.219:3000/api';

// ── Temporary auth ────────────────────────────────────────────────────────────

// TEMP: hardcoded user ID matching the lender_004 placeholder.
// Replace with your real auth store when ready.
let _currentUserId = 'lender_004';

export const setCurrentUserId = (id: string) => {
  _currentUserId = id;
};

export const getCurrentUserId = (): string => _currentUserId;

/**
 * Returns headers to attach to every API request.
 * x-user-id is read by @CurrentUser() on the backend as a fallback.
 */
const getAuthHeaders = (): Record<string, string> => ({
  'Content-Type': 'application/json',
  'x-user-id': _currentUserId,
});

// ── Response handler ──────────────────────────────────────────────────────────

const handleResponse = async (res: Response) => {
  const json = await res.json();
  if (!res.ok) {
    // Throw in the same shape as axios errors so service files handle uniformly
    throw { response: { data: json } };
  }
  return json;
};

// ── HTTP client ───────────────────────────────────────────────────────────────

export const api = {
  get: async (url: string) => {
    const res = await fetch(BASE_URL + url, {
      headers: getAuthHeaders(),
    });
    return handleResponse(res);
  },

  post: async (url: string, body?: any) => {
    const res = await fetch(BASE_URL + url, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: body ? JSON.stringify(body) : undefined,
    });
    return handleResponse(res);
  },

  patch: async (url: string, body?: any) => {
    const res = await fetch(BASE_URL + url, {
      method: 'PATCH',
      headers: getAuthHeaders(),
      body: body ? JSON.stringify(body) : undefined,
    });
    return handleResponse(res);
  },

  delete: async (url: string) => {
    const res = await fetch(BASE_URL + url, {
      method: 'DELETE',
      headers: getAuthHeaders(),
    });
    return handleResponse(res);
  },
};