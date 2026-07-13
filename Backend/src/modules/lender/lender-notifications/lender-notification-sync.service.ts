import { Injectable } from '@nestjs/common';
import { Timestamp, WriteBatch } from 'firebase-admin/firestore';
import { FirebaseService } from '../../../firebase/firebase.service';
import { LenderNotificationDraftFactory } from './lender-notification-draft.factory';
import { LenderNotificationSyncDataService } from './lender-notification-sync-data.service';
import type { LenderNotificationDraft as NotificationDraft } from './lender-notification-writer.service';

@Injectable()
export class LenderNotificationSyncService {
  constructor(
    private readonly firebaseService: FirebaseService,
    private readonly syncData: LenderNotificationSyncDataService,
    private readonly draftFactory: LenderNotificationDraftFactory,
  ) {}

  async sync(lenderId: string): Promise<void> {
    const context = await this.syncData.load(lenderId);
    const drafts = this.draftFactory.build({
      lenderId,
      requests: context.requests,
      transactions: context.transactions,
      loans: context.loans,
      disputes: context.disputes,
      ads: context.ads,
      loanMap: context.loanMap,
      borrowerMap: context.borrowerMap,
      overdueMap: context.overdueMap,
      lenderProfile: context.lenderProfile,
      preferences: context.preferences,
    });

    await this.persistDrafts(drafts);
    await this.firebaseService
      .getDb()
      .collection('lenderNotificationSync')
      .doc(lenderId)
      .set(
        {
          lenderId,
          lastSyncedAt: Timestamp.now(),
        },
        { merge: true },
      );
  }

  private async persistDrafts(drafts: NotificationDraft[]): Promise<void> {
    if (drafts.length === 0) return;

    const db = this.firebaseService.getDb();
    const refs = drafts.map((draft) =>
      db.collection('notifications').doc(draft.id),
    );
    const existingSnapshots = await db.getAll(...refs);
    const existingMap = new Map(
      existingSnapshots.map((snapshot) => [snapshot.id, snapshot.data() ?? {}]),
    );
    const batch = db.batch();

    drafts.forEach((draft) => {
      this.setNotificationDocument(
        batch,
        draft,
        existingMap.get(draft.id) ?? {},
      );
    });
    await batch.commit();
  }

  private setNotificationDocument(
    batch: WriteBatch,
    draft: NotificationDraft,
    existing: Record<string, unknown>,
  ): void {
    const readAt =
      existing.readAt instanceof Timestamp
        ? existing.readAt
        : existing.readAt instanceof Date
          ? Timestamp.fromDate(existing.readAt)
          : null;

    batch.set(
      this.firebaseService.getDb().collection('notifications').doc(draft.id),
      {
        notificationId: draft.id,
        userId: draft.lenderId,
        category: draft.category,
        eventType: draft.eventType,
        title: draft.title,
        body: draft.message,
        severity: draft.severity,
        isRead: existing.isRead === true,
        createdAt: Timestamp.fromDate(draft.createdAt),
        readAt,
        entityType: draft.relatedEntityType,
        entityId: draft.relatedEntityId,
        actionLabel: draft.actionLabel,
        actionTarget: draft.actionTarget,
        metadata: draft.metadata,
      },
    );
  }
}
