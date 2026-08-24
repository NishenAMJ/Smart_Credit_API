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
  // ADMIN: View audit logs - service
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
      const pageLogs = await this.enrichAuditLogs(
        pageDocs.map((doc) => this.mapStoredAudit(doc)),
      );

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
      action,
      actionType,
      description:
        String(metadata.description ?? metadata.reason ?? '').trim() ||
        action.replaceAll('.', ' '),
      performedBy: String(data.actorUserId ?? data.actorRole ?? 'System'),
      actorId: String(data.actorUserId ?? ''),
      targetName: String(data.entityId ?? 'System'),
      targetId: String(data.entityId ?? ''),
      targetType: this.mapTargetType(data.entityType),
      dateTime: this.formatDate(data.createdAt),
      severity:
        action.includes('reject') || action.includes('suspend')
          ? 'warning'
          : action.includes('approve') || action.includes('activate')
            ? 'success'
            : 'info',
      before: data.before ?? null,
      after: data.after ?? null,
      metadata,
      ipAddress:
        typeof metadata.ipAddress === 'string' ? metadata.ipAddress : undefined,
      sessionId:
        typeof metadata.sessionId === 'string' ? metadata.sessionId : undefined,
    };
  }

  private async enrichAuditLogs(logs: AuditLogEntry[]) {
    if (typeof this.firebaseService.db.getAll !== 'function') return logs;
    const actorIds = [...new Set(logs.map((log) => log.actorId).filter(Boolean))];
    const targets = logs.filter(
      (log) => log.targetId && ['user', 'ad', 'boost', 'dispute', 'transaction'].includes(log.targetType),
    );
    const targetCollection: Record<string, string> = {
      user: 'users',
      ad: 'loanListings',
      boost: 'adBoostRequests',
      dispute: 'disputes',
      transaction: 'transactions',
    };
    const [actors, targetDocs] = await Promise.all([
      actorIds.length
        ? this.firebaseService.db.getAll(
            ...actorIds.map((id) => this.firebaseService.db.collection('users').doc(id)),
          )
        : Promise.resolve([]),
      targets.length
        ? this.firebaseService.db.getAll(
            ...targets.map((log) =>
              this.firebaseService.db.collection(targetCollection[log.targetType]).doc(log.targetId),
            ),
          )
        : Promise.resolve([]),
    ]);
    const actorNames = new Map(
      actors.map((doc) => [doc.id, this.displayName(doc.data() ?? {}, doc.id)]),
    );
    const targetNames = new Map<string, string>();
    targetDocs.forEach((doc, index) => {
      const log = targets[index];
      const data = doc.data() ?? {};
      const name =
        log.targetType === 'user'
          ? this.displayName(data, doc.id)
          : String(
              data.title ??
                data.subject ??
                data.planName ??
                data.note ??
                data.disputeCode ??
                doc.id,
            );
      targetNames.set(`${log.targetType}:${log.targetId}`, name);
    });
    return logs.map((log) => ({
      ...log,
      performedBy: actorNames.get(log.actorId) ?? log.performedBy,
      targetName:
        targetNames.get(`${log.targetType}:${log.targetId}`) ?? log.targetName,
    }));
  }

  private displayName(data: FirebaseFirestore.DocumentData, fallback: string) {
    return (
      String(data.fullName ?? '').trim() ||
      [data.firstName, data.lastName].filter(Boolean).join(' ').trim() ||
      String(data.email ?? fallback)
    );
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
    const normalized = String(value) === 'ad_boost' ? 'boost' : String(value);
    return ['user', 'ad', 'boost', 'dispute', 'transaction', 'report'].includes(
      normalized,
    )
      ? (normalized as AuditLogEntry['targetType'])
      : 'system';
  }
}
