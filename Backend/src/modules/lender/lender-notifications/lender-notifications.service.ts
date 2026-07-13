import { Injectable, NotFoundException } from '@nestjs/common';
import {
  DocumentData,
  DocumentSnapshot,
  QueryDocumentSnapshot,
  Timestamp,
} from 'firebase-admin/firestore';
import { FirebaseService } from '../../../firebase/firebase.service';
import {
  applyDateCursor,
  buildPageInfo,
  orderByDateAndId,
  readDate,
} from '../../../firebase/firestore-query.utils';
import { LenderNotificationSyncService } from './lender-notification-sync.service';
import {
  LenderNotification,
  LenderNotificationsListResponse,
  LenderNotificationsSummaryResponse,
  MarkAllNotificationsReadResponse,
  NotificationActionTarget,
  NotificationCategory,
  NotificationEntityType,
  NotificationSeverity,
  NotificationStateFilter,
} from './lender-notifications.types';

const CATEGORY_ORDER: NotificationCategory[] = [
  'loan_request',
  'transaction',
  'repayment_risk',
  'dispute',
  'ad',
  'system',
];

@Injectable()
export class LenderNotificationsService {
  constructor(
    private readonly firebaseService: FirebaseService,
    private readonly notificationSync: LenderNotificationSyncService,
  ) {}

  async getNotifications(
    lenderId: string,
    category: string | undefined,
    state: NotificationStateFilter,
    pageSize = 60,
    cursor?: string | null,
  ): Promise<LenderNotificationsListResponse> {
    await this.notificationSync.sync(lenderId);

    const notifications = await this.loadNotifications(lenderId);
    const safePageSize = this.clamp(pageSize, 10, 100);
    const snapshot = await this.buildNotificationsQuery(
      lenderId,
      category,
      state,
      safePageSize,
      cursor,
    ).get();
    const items = snapshot.docs
      .slice(0, safePageSize)
      .map((doc) => this.mapNotification(doc));

    return {
      lenderId,
      unreadCount: notifications.filter((item) => !item.isRead).length,
      countsByCategory: this.buildCountsByCategory(notifications),
      notifications: items,
      pageInfo: buildPageInfo(
        items.map((item) => ({
          ...item,
          cursorDate: new Date(item.createdAt),
          cursorId: item.id,
        })),
        safePageSize,
        snapshot.docs.length > safePageSize,
      ),
    };
  }

  async getSummary(
    lenderId: string,
  ): Promise<LenderNotificationsSummaryResponse> {
    await this.notificationSync.sync(lenderId);

    const notifications = await this.loadNotifications(lenderId);
    const countsByCategory = this.buildCountsByCategory(notifications);

    return {
      lenderId,
      unreadCount: notifications.filter((item) => !item.isRead).length,
      totalCount: notifications.length,
      highPriorityCount: notifications.filter((item) =>
        ['warning', 'critical'].includes(item.severity),
      ).length,
      todaysCount: notifications.filter((item) => this.isToday(item.createdAt))
        .length,
      topCategory: this.getTopCategory(countsByCategory),
      countsByCategory,
    };
  }

  async markAsRead(
    lenderId: string,
    notificationId: string,
  ): Promise<LenderNotification> {
    const ref = this.firebaseService
      .getDb()
      .collection('notifications')
      .doc(notificationId);
    const snapshot = await ref.get();

    if (!snapshot.exists || snapshot.data()?.userId !== lenderId) {
      throw new NotFoundException(
        `Notification ${notificationId} was not found.`,
      );
    }

    if (snapshot.data()?.isRead !== true) {
      await ref.update({ isRead: true, readAt: Timestamp.now() });
    }

    return this.mapNotification(await ref.get());
  }

  async markAllAsRead(
    lenderId: string,
    category: string | undefined,
    state: NotificationStateFilter,
  ): Promise<MarkAllNotificationsReadResponse> {
    await this.notificationSync.sync(lenderId);

    const snapshot = await this.firebaseService
      .getDb()
      .collection('notifications')
      .where('userId', '==', lenderId)
      .get();
    const targets = snapshot.docs
      .map((doc) => this.mapNotification(doc))
      .filter((item) => this.matchesCategory(item, category))
      .filter((item) => this.matchesState(item, state))
      .filter((item) => !item.isRead);

    if (targets.length === 0) return { lenderId, updatedCount: 0 };

    const batch = this.firebaseService.getDb().batch();
    const readAt = Timestamp.now();
    targets.forEach((item) => {
      batch.update(
        this.firebaseService.getDb().collection('notifications').doc(item.id),
        { isRead: true, readAt },
      );
    });
    await batch.commit();

    return { lenderId, updatedCount: targets.length };
  }

  private async loadNotifications(
    lenderId: string,
  ): Promise<LenderNotification[]> {
    const snapshot = await orderByDateAndId(
      this.firebaseService
        .getDb()
        .collection('notifications')
        .where('userId', '==', lenderId),
      'createdAt',
    ).get();

    return snapshot.docs
      .map((doc) => this.mapNotification(doc))
      .sort((left, right) => this.compareNotifications(left, right));
  }

  private buildNotificationsQuery(
    lenderId: string,
    category: string | undefined,
    state: NotificationStateFilter,
    pageSize: number,
    cursor?: string | null,
  ) {
    let query = orderByDateAndId(
      this.firebaseService
        .getDb()
        .collection('notifications')
        .where('userId', '==', lenderId),
      'createdAt',
    );

    if (category && category !== 'all') {
      query = query.where('category', '==', category);
    }
    if (state === 'read') {
      query = query.where('isRead', '==', true);
    } else if (state === 'unread') {
      query = query.where('isRead', '==', false);
    }

    return applyDateCursor(query, cursor).limit(pageSize + 1);
  }

  private mapNotification(
    snapshot:
      | QueryDocumentSnapshot<DocumentData>
      | DocumentSnapshot<DocumentData>,
  ): LenderNotification {
    const data = snapshot.data() ?? {};

    return {
      id: snapshot.id,
      lenderId: typeof data.userId === 'string' ? data.userId : '',
      category: this.readCategory(data.category),
      eventType:
        typeof data.eventType === 'string' ? data.eventType : 'unknown',
      title: typeof data.title === 'string' ? data.title : 'Notification',
      message: typeof data.body === 'string' ? data.body : '',
      severity: this.readSeverity(data.severity),
      isRead: data.isRead === true,
      createdAt:
        readDate(data.createdAt)?.toISOString() ?? new Date().toISOString(),
      readAt: readDate(data.readAt)?.toISOString() ?? null,
      relatedEntityType: this.readEntityType(data.entityType),
      relatedEntityId: typeof data.entityId === 'string' ? data.entityId : null,
      actionLabel:
        typeof data.actionLabel === 'string' ? data.actionLabel : null,
      actionTarget: this.readActionTarget(data.actionTarget),
      metadata:
        data.metadata &&
        typeof data.metadata === 'object' &&
        !Array.isArray(data.metadata)
          ? (data.metadata as Record<string, string | number>)
          : {},
    };
  }

  private compareNotifications(
    left: LenderNotification,
    right: LenderNotification,
  ): number {
    if (left.isRead !== right.isRead) return left.isRead ? 1 : -1;
    if (left.category === 'system' && right.category !== 'system') return 1;
    if (right.category === 'system' && left.category !== 'system') return -1;
    return (
      new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime()
    );
  }

  private buildCountsByCategory(
    notifications: LenderNotification[],
  ): Record<NotificationCategory, number> {
    const counts = Object.fromEntries(
      CATEGORY_ORDER.map((category) => [category, 0]),
    ) as Record<NotificationCategory, number>;
    notifications.forEach((item) => {
      counts[item.category] += 1;
    });
    return counts;
  }

  private getTopCategory(
    counts: Record<NotificationCategory, number>,
  ): NotificationCategory | null {
    return (
      CATEGORY_ORDER.slice().sort(
        (left, right) => counts[right] - counts[left],
      )[0] ?? null
    );
  }

  private matchesCategory(
    item: LenderNotification,
    category?: string,
  ): boolean {
    return !category || category === 'all' || item.category === category;
  }

  private matchesState(
    item: LenderNotification,
    state: NotificationStateFilter,
  ): boolean {
    return (
      state === 'all' ||
      (state === 'read' && item.isRead) ||
      (state === 'unread' && !item.isRead)
    );
  }

  private isToday(value: string): boolean {
    const date = new Date(value);
    const today = new Date();
    return (
      !Number.isNaN(date.getTime()) &&
      date.getFullYear() === today.getFullYear() &&
      date.getMonth() === today.getMonth() &&
      date.getDate() === today.getDate()
    );
  }

  private readCategory(value: unknown): NotificationCategory {
    return CATEGORY_ORDER.includes(value as NotificationCategory)
      ? (value as NotificationCategory)
      : 'system';
  }

  private readSeverity(value: unknown): NotificationSeverity {
    return ['info', 'success', 'warning', 'critical'].includes(value as string)
      ? (value as NotificationSeverity)
      : 'info';
  }

  private readEntityType(value: unknown): NotificationEntityType {
    return [
      'loanRequest',
      'transaction',
      'loan',
      'dispute',
      'ad',
      'system',
      null,
    ].includes(value as NotificationEntityType)
      ? (value as NotificationEntityType)
      : null;
  }

  private readActionTarget(value: unknown): NotificationActionTarget {
    return [
      'pending-requests',
      'dashboard',
      'analytics',
      'create-ad',
      'settings',
      null,
    ].includes(value as NotificationActionTarget)
      ? (value as NotificationActionTarget)
      : null;
  }

  private clamp(value: number, min: number, max: number): number {
    return Math.min(Math.max(value, min), max);
  }
}
