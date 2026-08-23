'use strict';

const { Timestamp } = require('firebase-admin/firestore');
const { getDb } = require('../../shared/firebase');

const apply = process.argv.includes('--apply');

function rolesOf(user) {
  if (!user) return [];
  if (Array.isArray(user.roles)) return user.roles.map(String);
  if (Array.isArray(user.role)) return user.role.map(String);
  return typeof user.role === 'string' ? [user.role] : [];
}

function safe(value) {
  return String(value || 'none').replace(/[^a-zA-Z0-9_-]+/g, '-');
}

function scopedId(role, recipient, sourceId) {
  const prefix = `${role}__${recipient}__`;
  return sourceId.startsWith(prefix)
    ? sourceId
    : `${prefix}${safe(sourceId)}`;
}

function stable(value) {
  if (Array.isArray(value)) return value.map(stable);
  if (value && typeof value === 'object' && typeof value.toDate !== 'function') {
    return Object.fromEntries(
      Object.entries(value)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([key, nested]) => [key, stable(nested)]),
    );
  }
  return value;
}

function duplicateIds(docs, recipientField, entityFields) {
  const groups = new Map();
  for (const doc of docs) {
    const data = doc.data();
    const entityId = entityFields.map((field) => data[field]).find(Boolean) || '';
    const fingerprint = JSON.stringify(stable({
      recipient: data[recipientField] || '',
      eventType: data.eventType || data.type || data.category || '',
      entityId,
      title: data.title || '',
      message: data.body || data.message || '',
      metadata: data.metadata || {},
    }));
    const group = groups.get(fingerprint) || [];
    group.push(doc);
    groups.set(fingerprint, group);
  }
  const duplicates = new Set();
  for (const group of groups.values()) {
    group.sort((left, right) => left.id.localeCompare(right.id));
    group.slice(1).forEach((doc) => duplicates.add(doc.id));
  }
  return duplicates;
}

async function auditDelete(db, ref, recipient, reason) {
  if (!apply) return;
  const batch = db.batch();
  const auditRef = db.collection('auditLogs').doc();
  batch.create(auditRef, {
    auditLogId: auditRef.id,
    actorUserId: 'notification-ownership-migration',
    action: 'notification.deleted',
    entityType: 'notification',
    entityId: ref.id,
    metadata: { collection: ref.parent.id, recipient, reason },
    createdAt: Timestamp.now(),
  });
  batch.delete(ref);
  await batch.commit();
}

async function move(db, source, collection, id, data, reason) {
  if (!apply) return;
  const batch = db.batch();
  const target = db.collection(collection).doc(id);
  const auditRef = db.collection('auditLogs').doc();
  batch.set(target, data, { merge: true });
  if (target.path !== source.ref.path) batch.delete(source.ref);
  batch.create(auditRef, {
    auditLogId: auditRef.id,
    actorUserId: 'notification-ownership-migration',
    action: 'notification.migrated',
    entityType: 'notification',
    entityId: id,
    metadata: { from: source.ref.path, to: target.path, reason },
    createdAt: Timestamp.now(),
  });
  await batch.commit();
}

async function migrate() {
  if (apply && process.env.MIGRATION_ENABLED !== 'true') {
    throw new Error('Set MIGRATION_ENABLED=true only after reviewing the dry run.');
  }
  const db = getDb();
  const [usersSnapshot, lenderSnapshot, borrowerSnapshot] = await Promise.all([
    db.collection('users').get(),
    db.collection('notifications').get(),
    db.collection('borrowerNotifications').get(),
  ]);
  const users = new Map(usersSnapshot.docs.map((doc) => [doc.id, doc.data()]));
  const report = {
    lenderScoping: 0,
    borrowerScoping: 0,
    legacyLender: 0,
    movedKycToLender: 0,
    deletedMissingUser: 0,
    deletedWrongRole: 0,
    deletedExactDuplicates: 0,
  };
  const lenderDuplicates = duplicateIds(
    lenderSnapshot.docs,
    'userId',
    ['entityId', 'adId', 'loanId'],
  );
  const borrowerDuplicates = duplicateIds(
    borrowerSnapshot.docs,
    'borrowerId',
    ['relatedEntityId', 'loanId'],
  );

  for (const doc of lenderSnapshot.docs) {
    const data = doc.data();
    const recipient = String(data.userId || '');
    if (lenderDuplicates.has(doc.id)) {
      report.deletedExactDuplicates += 1;
      console.log(`DELETE notifications/${doc.id}: exact duplicate`);
      await auditDelete(db, doc.ref, recipient, 'exact_duplicate');
      continue;
    }
    const user = users.get(recipient);
    if (!user) {
      report.deletedMissingUser += 1;
      console.log(`DELETE notifications/${doc.id}: missing recipient`);
      await auditDelete(db, doc.ref, recipient, 'missing_recipient');
      continue;
    }
    if (!rolesOf(user).includes('lender')) {
      report.deletedWrongRole += 1;
      console.log(`DELETE notifications/${doc.id}: recipient is not a lender`);
      await auditDelete(db, doc.ref, recipient, 'wrong_role');
      continue;
    }

    const legacy = !('body' in data) || !('isRead' in data);
    if (legacy) report.legacyLender += 1;
    const id = scopedId('lender', recipient, doc.id);
    if (id !== doc.id) report.lenderScoping += 1;
    const canonical = {
      notificationId: id,
      userId: recipient,
      audienceRole: 'lender',
      category: data.category || (String(data.type || '').startsWith('ad_') ? 'ad' : 'system'),
      eventType: data.eventType || data.type || 'legacy_notification',
      title: data.title || 'Notification',
      body: data.body || data.message || '',
      severity: data.severity || (String(data.type || '').includes('rejected') ? 'warning' : 'info'),
      isRead: data.isRead === true || data.read === true,
      readAt: data.readAt || null,
      entityType: data.entityType || (data.adId ? 'ad' : null),
      entityId: data.entityId || data.adId || null,
      actionLabel: data.actionLabel || null,
      actionTarget: data.actionTarget || (data.adId ? 'active-ads-requests' : null),
      metadata: data.metadata || (data.adId ? { adId: data.adId } : {}),
      createdAt: data.createdAt || Timestamp.now(),
      updatedAt: Timestamp.now(),
    };
    if (legacy || id !== doc.id || data.audienceRole !== 'lender') {
      console.log(`MIGRATE notifications/${doc.id} -> notifications/${id}`);
      await move(db, doc, 'notifications', id, canonical, legacy ? 'legacy_schema' : 'recipient_scope');
    }
  }

  for (const doc of borrowerSnapshot.docs) {
    const data = doc.data();
    const recipient = String(data.borrowerId || '');
    if (borrowerDuplicates.has(doc.id)) {
      report.deletedExactDuplicates += 1;
      console.log(`DELETE borrowerNotifications/${doc.id}: exact duplicate`);
      await auditDelete(db, doc.ref, recipient, 'exact_duplicate');
      continue;
    }
    const user = users.get(recipient);
    if (!user) {
      report.deletedMissingUser += 1;
      console.log(`DELETE borrowerNotifications/${doc.id}: missing recipient`);
      await auditDelete(db, doc.ref, recipient, 'missing_recipient');
      continue;
    }
    const roles = rolesOf(user);
    if (!roles.includes('borrower')) {
      const isKyc = data.category === 'profile' && String(doc.id).includes('kyc-');
      if (isKyc && roles.includes('lender')) {
        const eventType = String(doc.id).includes('rejected') ? 'kyc_rejected' : 'kyc_approved';
        const id = scopedId('lender', recipient, `${eventType}-${recipient}`);
        report.movedKycToLender += 1;
        console.log(`MOVE borrowerNotifications/${doc.id} -> notifications/${id}`);
        await move(db, doc, 'notifications', id, {
          notificationId: id,
          userId: recipient,
          audienceRole: 'lender',
          category: 'system',
          eventType,
          title: data.title || 'KYC status updated',
          body: data.message || '',
          severity: data.severity || 'info',
          isRead: data.isRead === true,
          readAt: data.readAt || null,
          entityType: 'system',
          entityId: recipient,
          actionLabel: 'Open settings',
          actionTarget: 'settings',
          metadata: data.metadata || {},
          createdAt: data.createdAt || Timestamp.now(),
          updatedAt: Timestamp.now(),
        }, 'kyc_wrong_role');
      } else {
        report.deletedWrongRole += 1;
        console.log(`DELETE borrowerNotifications/${doc.id}: recipient is not a borrower`);
        await auditDelete(db, doc.ref, recipient, 'wrong_role');
      }
      continue;
    }
    const id = scopedId('borrower', recipient, doc.id);
    if (id !== doc.id) {
      report.borrowerScoping += 1;
      console.log(`MIGRATE borrowerNotifications/${doc.id} -> borrowerNotifications/${id}`);
      await move(db, doc, 'borrowerNotifications', id, { ...data, borrowerId: recipient, updatedAt: Timestamp.now() }, 'recipient_scope');
    }
  }

  console.log(JSON.stringify({ mode: apply ? 'apply' : 'dry-run', report }, null, 2));
}

if (require.main === module) {
  migrate().catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
}

module.exports = { migrate, rolesOf, scopedId };
