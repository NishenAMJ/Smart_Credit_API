export type NotificationCategory =
  | 'loan_request'
  | 'transaction'
  | 'repayment_risk'
  | 'dispute'
  | 'ad'
  | 'system';

export type NotificationSeverity = 'info' | 'success' | 'warning' | 'critical';

export type NotificationEntityType =
  | 'loanRequest'
  | 'transaction'
  | 'loan'
  | 'dispute'
  | 'ad'
  | 'system'
  | null;

export type NotificationActionTarget =
  | 'pending-requests'
  | 'dashboard'
  | 'analytics'
  | 'create-ad'
  | 'settings'
  | null;

export type NotificationStateFilter = 'all' | 'unread' | 'read';

export interface LenderNotificationMetadata {
  borrowerId?: string;
  loanId?: string;
  adId?: string;
  amount?: number;
  status?: string;
}

export interface LenderNotification {
  id: string;
  lenderId: string;
  category: NotificationCategory;
  eventType: string;
  title: string;
  message: string;
  severity: NotificationSeverity;
  isRead: boolean;
  createdAt: string;
  readAt: string | null;
  relatedEntityType: NotificationEntityType;
  relatedEntityId: string | null;
  actionLabel: string | null;
  actionTarget: NotificationActionTarget;
  metadata: LenderNotificationMetadata;
}

export interface LenderNotificationsListResponse {
  lenderId: string;
  unreadCount: number;
  countsByCategory: Record<NotificationCategory, number>;
  notifications: LenderNotification[];
  pageInfo: {
    pageSize: number;
    hasMore: boolean;
    nextCursor: string | null;
  };
}

export interface LenderNotificationsSummaryResponse {
  lenderId: string;
  unreadCount: number;
  totalCount: number;
  highPriorityCount: number;
  todaysCount: number;
  topCategory: NotificationCategory | null;
  countsByCategory: Record<NotificationCategory, number>;
}

export interface MarkAllNotificationsReadResponse {
  lenderId: string;
  updatedCount: number;
}
