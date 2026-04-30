import type {
  AuthResponse,
  DashboardResponse,
  LegalDocumentResponse,
  LoginPayload,
  MyKycSubmissionResponse,
  RegisterPayload,
  RegisterResponse,
  SessionResponse,
  SubmitKycPayload,
  SubmitKycResponse,
  UserRole,
} from './types';

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:3000/api';

export class ApiError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

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
    throw new ApiError(message, response.status);
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
  session(accessToken: string) {
    return request<SessionResponse>('/auth/session', {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });
  },
  dashboard(accessToken: string, role: UserRole) {
    const path =
      role === 'borrower'
        ? '/auth/borrower/dashboard'
        : role === 'admin'
          ? '/auth/admin/dashboard'
          : '/auth/lender/dashboard';

    return request<DashboardResponse>(path, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });
  },
  submitKyc(accessToken: string, payload: SubmitKycPayload) {
    return request<SubmitKycResponse>('/kyc/submit', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify(payload),
    });
  },
  getMyKycSubmission(accessToken: string) {
    return request<MyKycSubmissionResponse>('/kyc/my-submission', {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });
  },
  generateLegalDocument(accessToken: string, loanId: string) {
    return request<LegalDocumentResponse>(`/legal/documents/generate/${loanId}`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });
  },
  getLatestLegalDocument(accessToken: string, loanId: string) {
    return request<LegalDocumentResponse>(`/legal/documents/loan/${loanId}/latest`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });
  },
  acceptLegalDocument(accessToken: string, documentId: string) {
    return request<LegalDocumentResponse>(`/legal/documents/${documentId}/accept`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });
  },
  acceptLegalDocumentWithSignature(
    accessToken: string,
    documentId: string,
    payload: { signedName: string },
  ) {
    return request<LegalDocumentResponse>(`/legal/documents/${documentId}/accept`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify(payload),
    });
  },
  getLegalDocumentDownloadUrl(accessToken: string, documentId: string) {
    const baseUrl = API_BASE_URL.replace(/\/api$/, '');
    return `${baseUrl}/api/legal/documents/${documentId}/download?token=${encodeURIComponent(accessToken)}`;
  },
};
