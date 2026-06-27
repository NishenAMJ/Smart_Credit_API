// Shared authenticated fetch helpers for lender-only API calls.
import { getStoredSession } from "./lender-session";

export const API_BASE_URL =
  (import.meta.env.VITE_API_BASE_URL as string | undefined)?.replace(
    /\/$/,
    "",
  ) ?? "/api";

export async function parseApiError(
  response: Response,
  fallback: string,
): Promise<never> {
  // Normalizes array or string API error payloads into one thrown Error for page-level handlers.
  try {
    const body = (await response.json()) as { message?: string | string[] };
    const message = Array.isArray(body.message)
      ? body.message.join(", ")
      : body.message;
    throw new Error(message || fallback);
  } catch (error) {
    if (error instanceof Error) {
      throw error;
    }

    throw new Error(fallback);
  }
}

export function buildApiUrl(
  path: string,
  searchParams?: URLSearchParams,
): string {
  // Accepts relative paths from feature modules and attaches the configured API base consistently.
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;

  if (!searchParams || Array.from(searchParams.keys()).length === 0) {
    return `${API_BASE_URL}${normalizedPath}`;
  }

  return `${API_BASE_URL}${normalizedPath}?${searchParams.toString()}`;
}

export async function fetchLenderApi(
  path: string,
  init?: RequestInit,
): Promise<Response> {
  // Every lender API request requires the current access token from browser storage.
  const session = getStoredSession();
  const accessToken = session?.accessToken?.trim();

  if (!accessToken) {
    throw new Error("Your lender session has expired. Please sign in again.");
  }

  const headers = new Headers(init?.headers);
  headers.set("Authorization", `Bearer ${accessToken}`);

  return fetch(buildApiUrl(path), {
    ...init,
    headers,
  });
}

export async function fetchLenderApiWithQuery(
  path: string,
  searchParams: URLSearchParams,
  init?: RequestInit,
): Promise<Response> {
  // Mirrors fetchLenderApi while ensuring encoded query params are preserved in the request URL.
  const session = getStoredSession();
  const accessToken = session?.accessToken?.trim();

  if (!accessToken) {
    throw new Error("Your lender session has expired. Please sign in again.");
  }

  const headers = new Headers(init?.headers);
  headers.set("Authorization", `Bearer ${accessToken}`);

  return fetch(buildApiUrl(path, searchParams), {
    ...init,
    headers,
  });
}
