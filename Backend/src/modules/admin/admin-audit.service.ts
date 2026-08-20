import { Injectable } from '@nestjs/common';
import { FirebaseService } from '../../firebase/firebase.service';
import { AuditLogEntry } from './interfaces/audit-log.interface';
import { FirestoreTimestampLike } from './interfaces/user.interface';
import { rethrowFirebaseError } from '../../common/firebase-error';

type AuditTimestamp = FirestoreTimestampLike | Date;

@Injectable()
export class AdminAuditService {
  private static readonly DEFAULT_PAGE_SIZE = 20;
  private static readonly MAX_PAGE_SIZE = 50;

  constructor(private readonly firebaseService: FirebaseService) {}

  // Normalizes Firestore timestamps and Date objects for the audit table.
  private formatDate(value?: AuditTimestamp) {
    if (!value) {
      return 'N/A';
    }

    const date = value instanceof Date ? value : value.toDate?.();

    if (!date) {
      return 'N/A';
    }

    const parts = new Intl.DateTimeFormat('en-GB', {
      timeZone: 'Asia/Colombo',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    }).formatToParts(date);

    const partValue = (type: Intl.DateTimeFormatPartTypes) =>
      parts.find((part) => part.type === type)?.value || '00';

    return `${partValue('year')}-${partValue('month')}-${partValue('day')} ${partValue('hour')}:${partValue('minute')}:${partValue('second')}`;
  }

  private parseLimit(limit?: string) {
    const parsed = Number(limit ?? AdminAuditService.DEFAULT_PAGE_SIZE);
    if (!Number.isFinite(parsed)) {
      return AdminAuditService.DEFAULT_PAGE_SIZE;
    }

    return Math.min(
      Math.max(Math.trunc(parsed), 1),
      AdminAuditService.MAX_PAGE_SIZE,
    );
  }

  // Reads the immutable audit collection with bounded cursor pagination.
  async getAuditLogs(limit?: string, cursor?: string) {
    try {
      const db = this.firebaseService.db;
      const pageSize = this.parseLimit(limit);
      const collection = db.collection('auditLogs');
      let query: FirebaseFirestore.Query = collection.orderBy(
        'createdAt',
        'desc',
      );
      if (cursor) {
        const cursorDoc = await collection.doc(cursor).get();
        if (cursorDoc.exists) query = query.startAfter(cursorDoc);
      }
      const snapshot = await query.limit(pageSize + 1).get();
      const hasMore = snapshot.size > pageSize;
      const pageDocs = snapshot.docs.slice(0, pageSize);
      const pageLogs = pageDocs.map((doc) => this.mapStoredAudit(doc));

      return {
        success: true,
        count: pageLogs.length,
        logs: pageLogs,
        hasMore,
        nextCursor: hasMore ? pageDocs[pageDocs.length - 1]?.id : undefined,
      };
    } catch (error) {
      console.error('Error fetching audit logs:', error);
      rethrowFirebaseError(error, 'Failed to fetch audit logs');
    }
  }

  private mapStoredAudit(
    doc: FirebaseFirestore.QueryDocumentSnapshot,
  ): AuditLogEntry {
    const data = doc.data();
    const action = String(data.action ?? 'system.event');
    const actionType = this.mapStoredAction(action);
    const metadata =
      data.metadata && typeof data.metadata === 'object' ? data.metadata : {};
    return {
      id: doc.id,
      actionType,
      description:
        String(metadata.description ?? metadata.reason ?? '').trim() ||
        action.replaceAll('.', ' '),
      performedBy: String(data.actorUserId ?? data.actorRole ?? 'System'),
      targetName: String(data.entityId ?? 'System'),
      targetType: this.mapTargetType(data.entityType),
      dateTime: this.formatDate(data.createdAt),
      severity:
        action.includes('reject') || action.includes('suspend')
          ? 'warning'
          : action.includes('approve') || action.includes('activate')
            ? 'success'
            : 'info',
    };
  }

  private mapStoredAction(action: string): AuditLogEntry['actionType'] {
    if (action === 'kyc.approved') return 'kyc_approved';
    if (action === 'kyc.rejected') return 'kyc_rejected';
    if (action === 'user.suspended') return 'user_suspended';
    if (action === 'user.activated') return 'user_activated';
    if (action === 'ad.approved') return 'ad_approved';
    if (action === 'ad.rejected') return 'ad_rejected';
    if (action.startsWith('dispute.')) return 'dispute_updated';
    return 'system_event';
  }

  private mapTargetType(value: unknown): AuditLogEntry['targetType'] {
    return ['user', 'ad', 'dispute', 'transaction', 'report'].includes(
      String(value),
    )
      ? (String(value) as AuditLogEntry['targetType'])
      : 'system';
  }
}
