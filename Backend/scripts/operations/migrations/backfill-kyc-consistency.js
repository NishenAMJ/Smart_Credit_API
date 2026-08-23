'use strict';

const { Timestamp } = require('firebase-admin/firestore');
const { getDb } = require('../../shared/firebase');

const apply = process.argv.includes('--apply');
const USER_STATUSES = new Set([
  'not_submitted',
  'pending',
  'approved',
  'rejected',
]);

function inferStatus(currentStatus, documents) {
  if (USER_STATUSES.has(currentStatus)) return currentStatus;
  if (documents.length === 0) return 'not_submitted';

  const statuses = documents.map((document) => document.status);
  if (statuses.some((status) => status === 'rejected')) return 'rejected';
  if (statuses.every((status) => status === 'approved')) return 'approved';
  return 'pending';
}

function repairedDocumentStatus(userStatus, currentDocumentStatus) {
  // Approved/rejected files are immutable review history. Only unresolved
  // files can inherit a final canonical user decision.
  if (currentDocumentStatus !== 'pending_review') return null;
  if (userStatus === 'approved') return 'approved';
  if (userStatus === 'rejected') return 'rejected';
  return null;
}

async function backfill() {
  if (apply && process.env.KYC_BACKFILL_ENABLED !== 'true') {
    throw new Error(
      'Set KYC_BACKFILL_ENABLED=true only after reviewing the dry run.',
    );
  }

  const db = getDb();
  const [usersSnapshot, documentsSnapshot] = await Promise.all([
    db.collection('users').get(),
    db.collection('documents').where('category', '==', 'kyc').get(),
  ]);
  const documentsByUser = new Map();
  for (const document of documentsSnapshot.docs) {
    const data = document.data();
    if (data.deletedAt || !data.userId) continue;
    const documents = documentsByUser.get(data.userId) || [];
    documents.push({ ref: document.ref, status: data.status });
    documentsByUser.set(data.userId, documents);
  }

  let changedUsers = 0;
  let changedDocuments = 0;
  let changedBorrowers = 0;

  for (const userSnapshot of usersSnapshot.docs) {
    const user = userSnapshot.data();
    const userId = user.userId || user.uid || userSnapshot.id;
    const documents = documentsByUser.get(userId) || [];
    const canonicalStatus = inferStatus(user.kycStatus, documents);
    const roles = Array.isArray(user.roles)
      ? user.roles
      : Array.isArray(user.role)
        ? user.role
        : typeof user.role === 'string'
          ? [user.role]
          : user.primaryRole
            ? [user.primaryRole]
            : [];
    const userChanged = user.kycStatus !== canonicalStatus;
    const changedDocumentRefs = documents
      .map((document) => ({
        ref: document.ref,
        status: repairedDocumentStatus(canonicalStatus, document.status),
      }))
      .filter((document) => document.status);
    const borrowerSnapshot = roles.includes('borrower')
      ? await db.collection('borrowers').doc(userId).get()
      : null;
    const borrowerChanged = Boolean(
      borrowerSnapshot?.exists &&
      borrowerSnapshot.get('kycVerified') !== (canonicalStatus === 'approved'),
    );

    if (!userChanged && changedDocumentRefs.length === 0 && !borrowerChanged) {
      continue;
    }

    changedUsers += userChanged ? 1 : 0;
    changedDocuments += changedDocumentRefs.length;
    changedBorrowers += borrowerChanged ? 1 : 0;
    console.log(
      `${apply ? 'REPAIR' : 'WOULD REPAIR'} ${userId}: user=${canonicalStatus}, documents=${changedDocumentRefs.length}, borrower=${borrowerChanged}`,
    );
    if (!apply) continue;

    const batch = db.batch();
    const now = Timestamp.now();
    if (userChanged) {
      batch.set(
        userSnapshot.ref,
        { kycStatus: canonicalStatus, updatedAt: now },
        { merge: true },
      );
    }
    for (const document of changedDocumentRefs) {
      batch.set(
        document.ref,
        { status: document.status, updatedAt: now },
        { merge: true },
      );
    }
    if (borrowerChanged && borrowerSnapshot) {
      batch.set(
        borrowerSnapshot.ref,
        {
          kycVerified: canonicalStatus === 'approved',
          updatedAt: now,
        },
        { merge: true },
      );
    }
    await batch.commit();
  }

  console.log(
    `${apply ? 'Repaired' : 'Dry run found'} ${changedUsers} user, ${changedDocuments} document, and ${changedBorrowers} borrower-profile inconsistencies.`,
  );
}

module.exports = { inferStatus, repairedDocumentStatus };

if (require.main === module) {
  backfill().catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
}
