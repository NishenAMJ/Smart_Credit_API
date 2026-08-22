import { getApiBaseUrl } from './api';
import { clearAdminSession, getAdminToken } from './auth';

export type AdminNotification = {
  id: string;
  category: string;
  eventType: string;
  title: string;
  message: string;
  severity: string;
  entityType: string | null;
  entityId: string | null;
  actionLabel: string | null;
  actionTarget: string | null;
  isRead: boolean;
  createdAt: string;
  metadata: Record<string, unknown>;
};

export type AdminNotificationList = {
  notifications: AdminNotification[];
  unreadCount: number;
  totalCount: number;
  generatedAt: string;
};

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const token = getAdminToken();
  if (!token) throw new Error('You are not signed in.');
  const response = await fetch(`${getApiBaseUrl()}${path}`, {
    ...init,
    headers: { ...init?.headers, Authorization: `Bearer ${token}` },
  });
  const payload = await response.json().catch(() => null);
  if (!response.ok) {
    if (response.status === 401) clearAdminSession();
    throw new Error(payload?.message || 'Notification request failed.');
  }
  return payload.data as T;
}

export function getAdminNotifications(state: 'all' | 'read' | 'unread') {
  return request<AdminNotificationList>(
    `/admin/notifications?state=${encodeURIComponent(state)}&limit=100`,
  );
}

export function markAdminNotificationRead(id: string) {
  return request<AdminNotification>(
    `/admin/notifications/${encodeURIComponent(id)}/read`,
    { method: 'PATCH' },
  );
}

export function markAllAdminNotificationsRead() {
  return request<{ updatedCount: number; unreadCount: number }>(
    '/admin/notifications/mark-all-read',
    { method: 'PATCH' },
  );
}
