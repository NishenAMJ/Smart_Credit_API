import { getStoredSession } from "./lender-session";

export const API_BASE_URL =
  (import.meta.env.VITE_API_BASE_URL as string | undefined)?.replace(
    /\/$/,
    "",
  ) ?? "http://localhost:3000/api";

export async function parseApiError(
  response: Response,
  fallback: string,
): Promise<never> {
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
