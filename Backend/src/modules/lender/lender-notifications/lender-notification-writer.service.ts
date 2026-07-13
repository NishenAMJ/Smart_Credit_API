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

@Injectable()
export class LenderNotificationWriterService {
  constructor(private readonly firebaseService: FirebaseService) {}

  async create(draft: LenderNotificationDraft): Promise<void> {
    const notificationRef = this.firebaseService
      .getDb()
      .collection('notifications')
      .doc(draft.id);
    const existing = (await notificationRef.get()).data();

    await notificationRef.set({
      notificationId: draft.id,
      userId: draft.lenderId,
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
