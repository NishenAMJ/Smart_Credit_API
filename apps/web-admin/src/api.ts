import type {
  AuthResponse,
  LoginPayload,
  MeResponse,
  RegisterPayload,
  RegisterResponse,
} from './types';

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:3000/api';

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers ?? {}),
    },
  });

  const contentType = response.headers.get('content-type') ?? '';
  const payload = contentType.includes('application/json')
    ? await response.json().catch(() => null)
    : await response.text();

  if (!response.ok) {
    const message = resolveErrorMessage(payload);
    throw new Error(message);
  }

  return payload as T;
}

function resolveErrorMessage(payload: unknown): string {
  if (typeof payload === 'string' && payload.trim()) {
    return payload;
  }

  if (payload && typeof payload === 'object' && 'message' in payload) {
    const message = (payload as { message?: string | string[] }).message;

    if (Array.isArray(message)) {
      return message.join(' ');
    }

    if (typeof message === 'string' && message.trim()) {
      return message;
    }
  }

  return 'Something went wrong. Please try again.';
}

export const authApi = {
  register(payload: RegisterPayload) {
    return request<RegisterResponse>('/auth/register', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },
  login(payload: LoginPayload) {
    return request<AuthResponse>('/auth/login', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },
  me(accessToken: string) {
    return request<MeResponse>('/auth/me', {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });
  },
};

