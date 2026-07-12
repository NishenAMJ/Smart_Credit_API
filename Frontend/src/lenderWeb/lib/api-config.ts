import { getStoredSession } from './lender-session'

export const API_BASE_URL =
  (import.meta.env.VITE_API_BASE_URL as string | undefined)?.replace(/\/$/, '') ??
  'http://localhost:3000/api'

export function getAuthHeaders(
  headers: Record<string, string> = {},
): Record<string, string> {
  const accessToken = getStoredSession()?.accessToken

  return accessToken
    ? { ...headers, Authorization: `Bearer ${accessToken}` }
    : headers
}
