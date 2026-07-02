import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { FieldPath, Timestamp } from 'firebase-admin/firestore';
import { FirebaseService } from '../../../firebase/firebase.service';
import {
  buildPageInfo,
  decodeCursor,
  readDate,
  readNumber,
  readString,
} from '../../../firebase/firestore-query.utils';
import {
  BorrowerNotification,
  BorrowerNotificationCategory,
  BorrowerNotificationsListResponse,
  BorrowerNotificationsSummaryResponse,
  BorrowerNotificationSeverity,
  BorrowerNotificationState,
  MarkAllBorrowerNotificationsReadResponse,
} from './borrower-notifications.types';

type NotificationDraft = Omit<BorrowerNotification, 'createdAt' | 'readAt'> & {
  createdAt: Date;
};

@Injectable()
export class BorrowerNotificationsService {
  private readonly collection = 'borrowerNotifications';

  constructor(private readonly firebaseService: FirebaseService) {}

  async getNotifications(
    borrowerId: string,
    state: BorrowerNotificationState = 'all',
    pageSize = 30,
    cursor?: string | null,
  ): Promise<BorrowerNotificationsListResponse> {
    this.assertBorrowerId(borrowerId);
    await this.syncNotifications(borrowerId);

    const safePageSize = Math.min(Math.max(pageSize, 1), 60);
    const snapshot = await this.firebaseService
      .getDb()
      .collection(this.collection)
      .where('borrowerId', '==', borrowerId)
      .get();

    const decodedCursor = decodeCursor(cursor);
    const filtered = snapshot.docs
      .map((doc) => this.mapNotification(doc.id, doc.data()));
    const sorted = filtered
      .filter((notification) => {
        if (state === 'read') {
          return notification.isRead;
        }

        if (state === 'unread') {
          return !notification.isRead;
        }

        return true;
      })
      .sort((first, second) => {
        const dateDelta =
          new Date(second.createdAt).getTime() - new Date(first.createdAt).getTime();

        return dateDelta || second.id.localeCompare(first.id);
      })
      .filter((notification) => {
        if (!decodedCursor) {
          return true;
        }

        const createdAt = new Date(notification.createdAt);
        const timeDelta = createdAt.getTime() - decodedCursor.date.getTime();

        return timeDelta < 0 || (timeDelta === 0 && notification.id < decodedCursor.id);
      });
    const pageItems = sorted.slice(0, safePageSize + 1);
    const notifications = pageItems.slice(0, safePageSize);
    const unreadCount = await this.countUnread(borrowerId);

    return {
      borrowerId,
      notifications,
      unreadCount,
      pageInfo: buildPageInfo(
        notifications.map((notification) => ({
          ...notification,
          cursorDate: new Date(notification.createdAt),
          cursorId: notification.id,
        })),
        safePageSize,
        pageItems.length > safePageSize,
      ),
      generatedAt: new Date().toISOString(),
    };
  }

  async getSummary(
    borrowerId: string,
  ): Promise<BorrowerNotificationsSummaryResponse> {
    this.assertBorrowerId(borrowerId);
    await this.syncNotifications(borrowerId);

    const [totalCount, unreadCount] = await Promise.all([
      this.countForQuery(
        this.firebaseService
          .getDb()
          .collection(this.collection)
          .where('borrowerId', '==', borrowerId),
      ),
      this.countUnread(borrowerId),
    ]);

    return {
      borrowerId,
      totalCount,
      unreadCount,
      generatedAt: new Date().toISOString(),
    };
  }

  async markAllAsRead(
    borrowerId: string,
  ): Promise<MarkAllBorrowerNotificationsReadResponse> {
    this.assertBorrowerId(borrowerId);
    const snapshot = await this.firebaseService
      .getDb()
      .collection(this.collection)
      .where('borrowerId', '==', borrowerId)
      .where('isRead', '==', false)
      .get();
    const batch = this.firebaseService.getDb().batch();
    const now = Timestamp.now();

    snapshot.docs.forEach((doc) => {
      batch.update(doc.ref, {
        isRead: true,
        readAt: now,
        updatedAt: now,
      });
    });

    if (!snapshot.empty) {
      await batch.commit();
    }

    return {
      borrowerId,
      updatedCount: snapshot.docs.length,
      unreadCount: 0,
    };
  }

  async markAsRead(
    borrowerId: string,
    notificationId: string,
  ): Promise<BorrowerNotification> {
    this.assertBorrowerId(borrowerId);
    if (!notificationId.trim()) {
      throw new BadRequestException('notificationId is required.');
    }

    const ref = this.firebaseService
      .getDb()
      .collection(this.collection)
      .doc(notificationId.trim());
    const snapshot = await ref.get();

    if (!snapshot.exists || snapshot.get('borrowerId') !== borrowerId) {
      throw new NotFoundException('Notification was not found.');
    }

    const now = Timestamp.now();
    await ref.update({
      isRead: true,
      readAt: now,
      updatedAt: now,
    });

    const updated = await ref.get();
    return this.mapNotification(updated.id, updated.data() ?? {});
  }

  private async syncNotifications(borrowerId: string): Promise<void> {
    const drafts = await this.buildNotificationDrafts(borrowerId);
    if (drafts.length === 0) {
      return;
    }

    const db = this.firebaseService.getDb();
    const refs = drafts.map((draft) =>
      db.collection(this.collection).doc(draft.id),
    );
    const existingSnapshots = await db.getAll(...refs);
    const existingById = new Map(
      existingSnapshots
        .filter((snapshot) => snapshot.exists)
        .map((snapshot) => [snapshot.id, snapshot.data() ?? {}] as const),
    );
    const batch = db.batch();
    const now = Timestamp.now();

    drafts.forEach((draft, index) => {
      const existing = existingById.get(draft.id);
      batch.set(refs[index], {
        ...draft,
        createdAt: Timestamp.fromDate(draft.createdAt),
        isRead: existing?.isRead === true,
        readAt: existing?.readAt ?? null,
        updatedAt: now,
      });
    });

    await batch.commit();
  }

  private async buildNotificationDrafts(
    borrowerId: string,
  ): Promise<NotificationDraft[]> {
    const db = this.firebaseService.getDb();
    const [requestsSnapshot, loansSnapshot, profileSnapshot] =
      await Promise.all([
        db
          .collection('loanRequests')
          .where('borrowerId', '==', borrowerId)
          .orderBy('updatedAt', 'desc')
          .limit(20)
          .get()
          .catch(() => db.collection('loanRequests').where('borrowerId', '==', borrowerId).limit(20).get()),
        db.collection('loans').where('borrowerId', '==', borrowerId).get(),
        db.collection('users').doc(borrowerId).get(),
      ]);

    const drafts: NotificationDraft[] = [];

    requestsSnapshot.docs.forEach((doc) => {
      const data = doc.data();
      const status = String(data.status ?? '').toLowerCase();
      const requestId = readString(data.requestId, doc.id) ?? doc.id;
      const amount = readNumber(data.amount);
      const createdAt = readDate(data.updatedAt, data.createdAt) ?? new Date();

      if (status === 'approved') {
        drafts.push(
          this.createDraft({
            id: `application-approved-${requestId}`,
            borrowerId,
            category: 'application',
            severity: 'success',
            title: 'Application approved',
            message: amount
              ? `Your loan application for LKR ${amount.toLocaleString()} was approved.`
              : 'Your loan application was approved.',
            relatedEntityType: 'loanRequest',
            relatedEntityId: requestId,
            actionTarget: 'applications',
            createdAt,
            metadata: { status, amount },
          }),
        );
      } else if (status === 'rejected') {
        drafts.push(
          this.createDraft({
            id: `application-rejected-${requestId}`,
            borrowerId,
            category: 'application',
            severity: 'warning',
            title: 'Application rejected',
            message:
              readString(data.rejectionReason) ??
              'A lender rejected your loan application.',
            relatedEntityType: 'loanRequest',
            relatedEntityId: requestId,
            actionTarget: 'applications',
            createdAt,
            metadata: { status, amount },
          }),
        );
      } else if (['pending', 'under_review', 'open'].includes(status)) {
        drafts.push(
          this.createDraft({
            id: `application-review-${requestId}`,
            borrowerId,
            category: 'application',
            severity: 'info',
            title: 'Application under review',
            message: 'Your loan application is waiting for lender review.',
            relatedEntityType: 'loanRequest',
            relatedEntityId: requestId,
            actionTarget: 'applications',
            createdAt,
            metadata: { status, amount },
          }),
        );
      }
    });

    loansSnapshot.docs.forEach((doc) => {
      const data = doc.data();
      const status = String(data.status ?? '').toLowerCase();
      const nextDueDate = readDate(data.nextDueDate);
      const outstandingBalance = readNumber(data.outstandingBalance);
      const monthlyInstallment = readNumber(data.monthlyInstallment);

      if (status !== 'active' || !nextDueDate || outstandingBalance <= 0) {
        return;
      }

      const daysUntilDue = Math.ceil(
        (nextDueDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24),
      );

      if (daysUntilDue < 0 || daysUntilDue > 7) {
        return;
      }

      const loanId = readString(data.loanId, doc.id) ?? doc.id;
      drafts.push(
        this.createDraft({
          id: `payment-due-${loanId}-${nextDueDate.toISOString().slice(0, 10)}`,
          borrowerId,
          category: 'payment',
          severity: daysUntilDue <= 1 ? 'critical' : 'warning',
          title: daysUntilDue <= 1 ? 'Payment due soon' : 'Upcoming payment',
          message: `LKR ${monthlyInstallment.toLocaleString()} is due ${
            daysUntilDue === 0 ? 'today' : `in ${daysUntilDue} day(s)`
          }.`,
          relatedEntityType: 'loan',
          relatedEntityId: loanId,
          actionTarget: 'payments',
          createdAt: nextDueDate,
          metadata: { loanId, amount: monthlyInstallment, daysUntilDue },
        }),
      );
    });

    const profile = profileSnapshot.data();
    if (profile && profile.kycVerified !== true) {
      drafts.push(
        this.createDraft({
          id: `profile-kyc-${borrowerId}`,
          borrowerId,
          category: 'profile',
          severity: 'info',
          title: 'Complete KYC verification',
          message: 'Complete KYC to unlock loan applications.',
          relatedEntityType: 'profile',
          relatedEntityId: borrowerId,
          actionTarget: 'profile',
          createdAt: readDate(profile.createdAt) ?? new Date(),
          metadata: { kycVerified: false },
        }),
      );
    }

    return drafts;
  }

  private createDraft(
    draft: Omit<NotificationDraft, 'isRead'>,
  ): NotificationDraft {
    return {
      ...draft,
      isRead: false,
    };
  }

  private mapNotification(
    id: string,
    data: FirebaseFirestore.DocumentData,
  ): BorrowerNotification {
    const createdAt = readDate(data.createdAt) ?? new Date();
    const readAt = readDate(data.readAt);

    return {
      id,
      borrowerId: String(data.borrowerId ?? ''),
      category: this.readCategory(data.category),
      severity: this.readSeverity(data.severity),
      title: readString(data.title) ?? 'Notification',
      message: readString(data.message) ?? '',
      isRead: data.isRead === true,
      relatedEntityType: readString(data.relatedEntityType),
      relatedEntityId: readString(data.relatedEntityId),
      actionTarget: readString(data.actionTarget),
      createdAt: createdAt.toISOString(),
      readAt: readAt ? readAt.toISOString() : null,
      metadata:
        data.metadata && typeof data.metadata === 'object'
          ? (data.metadata as Record<string, unknown>)
          : {},
    };
  }

  private readCategory(value: unknown): BorrowerNotificationCategory {
    return ['application', 'payment', 'profile', 'system'].includes(
      value as string,
    )
      ? (value as BorrowerNotificationCategory)
      : 'system';
  }

  private readSeverity(value: unknown): BorrowerNotificationSeverity {
    return ['info', 'success', 'warning', 'critical'].includes(value as string)
      ? (value as BorrowerNotificationSeverity)
      : 'info';
  }

  private async countUnread(borrowerId: string): Promise<number> {
    return this.countForQuery(
      this.firebaseService
        .getDb()
        .collection(this.collection)
        .where('borrowerId', '==', borrowerId)
        .where('isRead', '==', false),
    );
  }

  private async countForQuery(query: FirebaseFirestore.Query): Promise<number> {
    if (typeof query.count === 'function') {
      const snapshot = await query.count().get();
      return snapshot.data().count;
    }

    const snapshot = await query.select(FieldPath.documentId()).get();
    return snapshot.size;
  }

  private assertBorrowerId(borrowerId: string): void {
    if (!borrowerId?.trim()) {
      throw new BadRequestException('borrowerId is required.');
    }
  }
}
