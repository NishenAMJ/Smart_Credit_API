import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { createHash } from 'crypto';
import { Timestamp } from 'firebase-admin/firestore';
import { FirebaseService } from '../../firebase/firebase.service';
import { readDate, readString } from '../../firebase/firestore-query.utils';

export type AdminNotificationState = 'all' | 'read' | 'unread';

@Injectable()
export class AdminNotificationsService {
  constructor(private readonly firebaseService: FirebaseService) {}

  async list(adminId: string, state: AdminNotificationState, limit = 50) {
    const safeLimit = Math.min(Math.max(limit, 1), 100);
    const snapshot = await this.firebaseService.db
      .collection('adminNotifications')
      .where('audienceRole', '==', 'admin')
      .get();
    const docs = snapshot.docs.sort((a, b) => {
      const left = readDate(a.get('createdAt'))?.getTime() ?? 0;
      const right = readDate(b.get('createdAt'))?.getTime() ?? 0;
      return right - left || b.id.localeCompare(a.id);
    });
    const reads = await this.loadReadSet(adminId);
    const all = docs.map((doc) =>
      this.map(doc.id, doc.data(), reads.has(doc.id)),
    );
    const filtered = all.filter((item) =>
      state === 'read' ? item.isRead : state === 'unread' ? !item.isRead : true,
    );
    return {
      notifications: filtered.slice(0, safeLimit),
      unreadCount: all.filter((item) => !item.isRead).length,
      totalCount: all.length,
      generatedAt: new Date().toISOString(),
    };
  }

  async summary(adminId: string) {
    const result = await this.list(adminId, 'all', 1);
    return {
      unreadCount: result.unreadCount,
      totalCount: result.totalCount,
      generatedAt: result.generatedAt,
    };
  }

  async markAsRead(adminId: string, notificationId: string) {
    const id = notificationId.trim();
    if (!id) throw new BadRequestException('notificationId is required.');
    const notification = await this.firebaseService.db
      .collection('adminNotifications')
      .doc(id)
      .get();
    if (!notification.exists || notification.get('audienceRole') !== 'admin') {
      throw new NotFoundException('Notification was not found.');
    }
    await this.writeReadReceipt(adminId, id);
    return this.map(id, notification.data() ?? {}, true);
  }

  async markAllAsRead(adminId: string) {
    const snapshot = await this.firebaseService.db
      .collection('adminNotifications')
      .where('audienceRole', '==', 'admin')
      .get();
    const reads = await this.loadReadSet(adminId);
    const unread = snapshot.docs.filter((doc) => !reads.has(doc.id));
    const now = Timestamp.now();
    for (let offset = 0; offset < unread.length; offset += 450) {
      const batch = this.firebaseService.db.batch();
      unread.slice(offset, offset + 450).forEach((doc) => {
        batch.set(
          this.firebaseService.db
            .collection('adminNotificationReads')
            .doc(this.readReceiptId(adminId, doc.id)),
          { adminId, notificationId: doc.id, readAt: now },
        );
      });
      await batch.commit();
    }
    return { updatedCount: unread.length, unreadCount: 0 };
  }

  private async loadReadSet(adminId: string): Promise<Set<string>> {
    const snapshot = await this.firebaseService.db
      .collection('adminNotificationReads')
      .where('adminId', '==', adminId)
      .get();
    return new Set(
      snapshot.docs.map((doc) => String(doc.get('notificationId'))),
    );
  }

  private async writeReadReceipt(adminId: string, notificationId: string) {
    await this.firebaseService.db
      .collection('adminNotificationReads')
      .doc(this.readReceiptId(adminId, notificationId))
      .set({ adminId, notificationId, readAt: Timestamp.now() });
  }

  private map(id: string, data: FirebaseFirestore.DocumentData, isRead: boolean) {
    return {
      id,
      category: readString(data.category) ?? 'system',
      eventType: readString(data.eventType) ?? 'system_event',
      title: readString(data.title) ?? 'Admin notification',
      message: readString(data.body) ?? '',
      severity: readString(data.severity) ?? 'info',
      entityType: readString(data.entityType),
      entityId: readString(data.entityId),
      actionLabel: readString(data.actionLabel),
      actionTarget: readString(data.actionTarget),
      isRead,
      createdAt: (readDate(data.createdAt) ?? new Date()).toISOString(),
      metadata:
        data.metadata && typeof data.metadata === 'object' ? data.metadata : {},
    };
  }

  private readReceiptId(adminId: string, notificationId: string): string {
    return createHash('sha256')
      .update(`${adminId}:${notificationId}`)
      .digest('hex');
  }
}
