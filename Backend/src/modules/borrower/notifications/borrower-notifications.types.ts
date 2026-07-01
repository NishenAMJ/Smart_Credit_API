export type BorrowerNotificationCategory =
  | 'application'
  | 'payment'
  | 'profile'
  | 'system';

export type BorrowerNotificationSeverity =
  | 'info'
  | 'success'
  | 'warning'
  | 'critical';

export type BorrowerNotificationState = 'all' | 'read' | 'unread';

export interface BorrowerNotification {
  id: string;
  borrowerId: string;
  category: BorrowerNotificationCategory;
  severity: BorrowerNotificationSeverity;
  title: string;
  message: string;
  isRead: boolean;
  relatedEntityType: string | null;
  relatedEntityId: string | null;
  actionTarget: string | null;
  createdAt: string;
  readAt: string | null;
  metadata: Record<string, unknown>;
}

export interface BorrowerNotificationsListResponse {
  borrowerId: string;
  notifications: BorrowerNotification[];
  unreadCount: number;
  pageInfo: {
    pageSize: number;
    hasMore: boolean;
    nextCursor: string | null;
  };
  generatedAt: string;
}

export interface BorrowerNotificationsSummaryResponse {
  borrowerId: string;
  totalCount: number;
  unreadCount: number;
  generatedAt: string;
}

export interface MarkAllBorrowerNotificationsReadResponse {
  borrowerId: string;
  updatedCount: number;
  unreadCount: number;
}
