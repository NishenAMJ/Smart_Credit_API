import { BadRequestException, Injectable } from '@nestjs/common';
import { Timestamp } from 'firebase-admin/firestore';
import { FirebaseService } from '../../firebase/firebase.service';
import type { UserRole } from '../../modules/auth/auth.types';

export type RoleNotificationInput = {
  eventType: string;
  title: string;
  message: string;
  category: string;
  severity?: 'info' | 'success' | 'warning' | 'critical';
  entityType?: string | null;
  entityId?: string | null;
  eventId?: string | null;
  actionLabel?: string | null;
  actionTarget?: string | null;
  metadata?: Record<string, unknown>;
  createdAt?: Date;
};

@Injectable()
export class RoleNotificationService {
  constructor(private readonly firebaseService: FirebaseService) {}

  async createBorrower(
    borrowerId: string,
    input: RoleNotificationInput,
  ): Promise<string> {
    await this.assertRecipientRole(borrowerId, 'borrower');
    const id = this.buildId('borrower', borrowerId, input);
    const ref = this.firebaseService.db
      .collection('borrowerNotifications')
      .doc(id);
    const existing = await ref.get();
    const existingData = existing.data();
    this.assertExistingRecipient(existingData, 'borrowerId', borrowerId);
    const now = Timestamp.now();

    await ref.set({
      borrowerId,
      category: input.category,
      severity: input.severity ?? 'info',
      title: input.title,
      message: input.message,
      isRead: existingData?.isRead === true,
      readAt: existingData?.readAt ?? null,
      relatedEntityType: input.entityType ?? null,
      relatedEntityId: input.entityId ?? null,
      actionTarget: input.actionTarget ?? null,
      metadata: input.metadata ?? {},
      eventType: input.eventType,
      eventId: input.eventId ?? null,
      createdAt: input.createdAt
        ? Timestamp.fromDate(input.createdAt)
        : (existingData?.createdAt ?? now),
      updatedAt: now,
    });
    return id;
  }

  async createLender(
    lenderId: string,
    input: RoleNotificationInput,
  ): Promise<string> {
    await this.assertRecipientRole(lenderId, 'lender');
    const id = this.buildId('lender', lenderId, input);
    const ref = this.firebaseService.db.collection('notifications').doc(id);
    const existing = await ref.get();
    const existingData = existing.data();
    this.assertExistingRecipient(existingData, 'userId', lenderId);
    const now = Timestamp.now();

    await ref.set({
      notificationId: id,
      userId: lenderId,
      audienceRole: 'lender',
      category: input.category,
      eventType: input.eventType,
      title: input.title,
      body: input.message,
      severity: input.severity ?? 'info',
      isRead: existingData?.isRead === true,
      readAt: existingData?.readAt ?? null,
      entityType: input.entityType ?? null,
      entityId: input.entityId ?? null,
      eventId: input.eventId ?? null,
      actionLabel: input.actionLabel ?? null,
      actionTarget: input.actionTarget ?? null,
      metadata: input.metadata ?? {},
      createdAt: input.createdAt
        ? Timestamp.fromDate(input.createdAt)
        : (existingData?.createdAt ?? now),
      updatedAt: now,
    });
    return id;
  }

  async createAdmin(input: RoleNotificationInput): Promise<string> {
    const id = this.buildId('admin', 'shared', input);
    const ref = this.firebaseService.db.collection('adminNotifications').doc(id);
    const existing = await ref.get();
    const now = Timestamp.now();

    await ref.set({
      notificationId: id,
      audienceRole: 'admin',
      category: input.category,
      eventType: input.eventType,
      title: input.title,
      body: input.message,
      severity: input.severity ?? 'info',
      entityType: input.entityType ?? null,
      entityId: input.entityId ?? null,
      eventId: input.eventId ?? null,
      actionLabel: input.actionLabel ?? null,
      actionTarget: input.actionTarget ?? null,
      metadata: input.metadata ?? {},
      createdAt: input.createdAt
        ? Timestamp.fromDate(input.createdAt)
        : (existing.data()?.createdAt ?? now),
      updatedAt: now,
    });
    return id;
  }

  buildId(
    role: UserRole,
    recipient: string,
    input: Pick<
      RoleNotificationInput,
      'eventType' | 'entityType' | 'entityId' | 'eventId'
    >,
  ): string {
    const parts = [
      role,
      recipient,
      input.eventType,
      input.entityType ?? 'system',
      input.entityId ?? 'platform',
      input.eventId ?? 'current',
    ];
    return parts.map((part) => this.safeIdPart(part)).join('__').slice(0, 1400);
  }

  private async assertRecipientRole(
    userId: string,
    role: Extract<UserRole, 'borrower' | 'lender'>,
  ): Promise<void> {
    if (!userId?.trim()) {
      throw new BadRequestException('Notification recipient is required.');
    }
    const snapshot = await this.firebaseService.db
      .collection('users')
      .doc(userId)
      .get();
    const data = snapshot.data();
    const roles = Array.isArray(data?.roles)
      ? data.roles.map((value: unknown) => String(value).toLowerCase())
      : typeof data?.role === 'string'
        ? [data.role.toLowerCase()]
        : [];
    if (!snapshot.exists || !roles.includes(role)) {
      throw new BadRequestException(
        `Notification recipient is not an active ${role}.`,
      );
    }
  }

  private assertExistingRecipient(
    data: FirebaseFirestore.DocumentData | undefined,
    field: 'borrowerId' | 'userId',
    expected: string,
  ): void {
    if (data && data[field] !== expected) {
      throw new BadRequestException(
        'Notification ID is already assigned to another recipient.',
      );
    }
  }

  private safeIdPart(value: string): string {
    return String(value)
      .trim()
      .replace(/[^a-zA-Z0-9_-]+/g, '-')
      .replace(/^-+|-+$/g, '') || 'none';
  }
}
