import { Injectable } from '@nestjs/common';
import { Timestamp } from 'firebase-admin/firestore';
import { FirebaseService } from '../../../firebase/firebase.service';
import {
  NotificationActionTarget,
  NotificationCategory,
  NotificationEntityType,
  NotificationSeverity,
} from './lender-notifications.types';

export type LenderNotificationDraft = {
  id: string;
  lenderId: string;
  category: NotificationCategory;
  eventType: string;
  title: string;
  message: string;
  severity: NotificationSeverity;
  createdAt: Date;
  relatedEntityType: NotificationEntityType;
  relatedEntityId: string | null;
  actionLabel: string | null;
  actionTarget: NotificationActionTarget;
  metadata: Record<string, string | number>;
};

export function lenderNotificationId(lenderId: string, eventId: string): string {
  const prefix = `lender__${lenderId}__`;
  return eventId.startsWith(prefix) ? eventId : `${prefix}${eventId}`;
}

@Injectable()
export class LenderNotificationWriterService {
  constructor(private readonly firebaseService: FirebaseService) {}

  async create(draft: LenderNotificationDraft): Promise<void> {
    const notificationId = lenderNotificationId(draft.lenderId, draft.id);
    const notificationRef = this.firebaseService
      .getDb()
      .collection('notifications')
      .doc(notificationId);
    const existing = (await notificationRef.get()).data();

    if (existing && existing.userId !== draft.lenderId) {
      throw new Error('Notification ID belongs to another lender.');
    }

    await notificationRef.set({
      notificationId,
      userId: draft.lenderId,
      audienceRole: 'lender',
      category: draft.category,
      eventType: draft.eventType,
      title: draft.title,
      body: draft.message,
      severity: draft.severity,
      isRead: existing?.isRead === true,
      createdAt: Timestamp.fromDate(draft.createdAt),
      readAt: existing?.readAt instanceof Timestamp ? existing.readAt : null,
      entityType: draft.relatedEntityType,
      entityId: draft.relatedEntityId,
      actionLabel: draft.actionLabel,
      actionTarget: draft.actionTarget,
      metadata: draft.metadata,
    });
  }
}
