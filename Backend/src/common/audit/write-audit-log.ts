import { Timestamp } from 'firebase-admin/firestore';

// ADMIN: Write audit log - database
export async function writeAuditLog(
  db: FirebaseFirestore.Firestore,
  input: {
    actorUserId: string;
    actorRole?: string;
    action: string;
    entityType: string;
    entityId: string;
    before?: unknown;
    after?: unknown;
    metadata?: Record<string, unknown>;
  },
): Promise<void> {
  try {
    const ref = db.collection('auditLogs').doc();
    await ref.set({
      auditLogId: ref.id,
      actorUserId: input.actorUserId,
      actorRole: input.actorRole ?? 'admin',
      action: input.action,
      entityType: input.entityType,
      entityId: input.entityId,
      before: input.before ?? null,
      after: input.after ?? null,
      metadata: input.metadata ?? {},
      createdAt: Timestamp.now(),
    });
  } catch (error) {
    console.error('Failed to persist audit log.', error);
  }
}
