'use strict';

const { Timestamp } = require('firebase-admin/firestore');
const { getDb } = require('../../shared/firebase');

const apply = process.argv.includes('--apply');
const activeStatuses = new Set([
  'open',
  'under_review',
  'awaiting_response',
  'escalated',
  'resolved',
  'closed',
]);

function asTimestamp(value, fallback) {
  if (value?.toMillis instanceof Function) return value;
  if (value instanceof Date) return Timestamp.fromDate(value);
  return fallback;
}

function normalizeStatus(value) {
  if (value === 'in-progress') return 'under_review';
  if (value === 'awaiting-response') return 'awaiting_response';
  return activeStatuses.has(value) ? value : 'open';
}

function normalizeCategory(value) {
  if (value === 'repayment' || value === 'service') return 'payment';
  return ['payment', 'loan_terms', 'fraud', 'conduct', 'other'].includes(value)
    ? value
    : 'other';
}

function priority(category) {
  if (category === 'fraud') return 'critical';
  if (category === 'payment') return 'high';
  if (category === 'loan_terms' || category === 'conduct') return 'medium';
  return 'low';
}

async function migrate() {
  if (apply && process.env.MIGRATION_ENABLED !== 'true') {
    throw new Error('Set MIGRATION_ENABLED=true after reviewing the dry run.');
  }

  const db = getDb();
  const snapshot = await db.collection('disputes').get();
  let changed = 0;

  for (const source of snapshot.docs) {
    const legacy = source.data();
    const loanSnapshot = legacy.loanId
      ? await db.collection('loans').doc(legacy.loanId).get()
      : null;
    const loan = loanSnapshot?.data() || {};
    const complainantId =
      legacy.complainantId ||
      legacy.openedByUserId ||
      legacy.raisedByUserId ||
      loan.borrowerId ||
      '';
    const complainantRole =
      legacy.complainantRole ||
      legacy.raisedByRole ||
      (complainantId === loan.lenderId ? 'lender' : 'borrower');
    const respondentId =
      legacy.respondentId ||
      legacy.againstUserId ||
      (complainantRole === 'borrower' ? loan.lenderId : loan.borrowerId) ||
      '';
    const category = normalizeCategory(legacy.category);
    const now = Timestamp.now();
    const resolutionTime = asTimestamp(
      legacy.resolvedAt || legacy.updatedAt,
      now,
    );
    const canonical = {
      disputeId: legacy.disputeId || source.id,
      disputeCode:
        legacy.disputeCode || `DSP-${source.id.slice(0, 8).toUpperCase()}`,
      loanId: legacy.loanId || '',
      transactionId: legacy.transactionId || null,
      installmentId: legacy.installmentId || null,
      complainantId,
      complainantRole,
      respondentId,
      respondentRole: complainantRole === 'borrower' ? 'lender' : 'borrower',
      borrowerId: legacy.borrowerId || loan.borrowerId || '',
      lenderId: legacy.lenderId || loan.lenderId || '',
      borrowerName: legacy.borrowerName || loan.borrowerName || '',
      lenderName: legacy.lenderName || loan.lenderName || '',
      category,
      subject: legacy.subject || legacy.title || 'Migrated dispute',
      description: legacy.description || '',
      desiredOutcome: legacy.desiredOutcome || 'Admin review requested.',
      disputedAmountMinor:
        legacy.disputedAmountMinor ??
        (typeof legacy.disputedAmount === 'number'
          ? Math.round(legacy.disputedAmount * 100)
          : null),
      currency: 'LKR',
      // Keep legacy evidenceUrls untouched via merge. They cannot safely be
      // treated as document IDs until imported into the secured document store.
      evidenceDocumentIds: legacy.evidenceDocumentIds || [],
      status: normalizeStatus(legacy.status),
      priority: legacy.priority || priority(category),
      assignedAdminId: legacy.assignedAdminId || legacy.assignedTo || null,
      resolution:
        legacy.resolution && typeof legacy.resolution === 'object'
          ? legacy.resolution
          : typeof legacy.resolution === 'string' && legacy.resolution.trim()
            ? {
                summary: legacy.resolution.trim(),
                recommendedActions: [],
                issuedByAdminId:
                  legacy.assignedAdminId || legacy.assignedTo || 'legacy-admin',
                issuedAt: resolutionTime,
                reopenUntil: Timestamp.fromMillis(
                  resolutionTime.toMillis() + 7 * 24 * 60 * 60 * 1000,
                ),
              }
            : null,
      acknowledgements: legacy.acknowledgements || {},
      reopenCount: Number(legacy.reopenCount || 0),
      createdAt: legacy.createdAt || now,
      updatedAt: legacy.updatedAt || legacy.createdAt || now,
      resolvedAt: legacy.resolvedAt || null,
      closedAt: legacy.closedAt || null,
    };
    const events = await source.ref.collection('events').limit(1).get();
    changed += 1;
    console.log(`${apply ? 'MIGRATE' : 'WOULD MIGRATE'} ${source.id}`);
    if (!apply) continue;
    const batch = db.batch();
    batch.set(source.ref, canonical, { merge: true });
    if (events.empty) {
      const eventRef = source.ref.collection('events').doc();
      batch.set(eventRef, {
        eventId: eventRef.id,
        disputeId: source.id,
        actorUserId: complainantId || 'system',
        actorRole: complainantId ? complainantRole : 'system',
        type: 'created',
        message: canonical.description || 'Dispute migrated.',
        previousStatus: null,
        nextStatus: canonical.status,
        documentIds: canonical.evidenceDocumentIds,
        visibility: 'shared',
        createdAt: canonical.createdAt,
      });
    }
    await batch.commit();
  }

  console.log(`${apply ? 'Migrated' : 'Dry run found'} ${changed} disputes.`);
}

migrate().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
