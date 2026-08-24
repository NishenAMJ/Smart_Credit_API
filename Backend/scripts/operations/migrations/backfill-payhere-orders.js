'use strict';

const { FieldValue, Timestamp } = require('firebase-admin/firestore');
const { getDb } = require('../../shared/firebase');

const apply = process.argv.includes('--apply');
const ACTIVE = new Set([
  'initiated',
  'pending',
  'processing',
  'processing_failed',
]);
const VALID = new Set([
  ...ACTIVE,
  'completed',
  'cancelled',
  'failed',
  'charged_back',
  'expired',
]);

function toDate(value) {
  if (value instanceof Timestamp) return value.toDate();
  if (value && typeof value.toDate === 'function') return value.toDate();
  if (value instanceof Date) return value;
  return value ? new Date(value) : null;
}

function amountMinor(data) {
  if (Number.isSafeInteger(data.amountMinor) && data.amountMinor > 0) {
    return data.amountMinor;
  }
  const amount = Number(data.amount);
  return Number.isFinite(amount) && amount > 0
    ? Math.round(amount * 100)
    : null;
}

async function migrateCollection(db, collectionName) {
  const snapshot = await db.collection(collectionName).get();
  let changed = 0;
  let invalid = 0;
  let batch = db.batch();
  let batchSize = 0;
  for (const document of snapshot.docs) {
    const data = document.data();
    const minor = amountMinor(data);
    if (!minor) {
      invalid += 1;
      console.warn(`SKIP ${document.ref.path}: invalid amount`);
      continue;
    }
    const createdAt = toDate(data.createdAt) ?? new Date();
    const status = VALID.has(String(data.status))
      ? String(data.status)
      : 'failed';
    const update = {
      amountMinor: minor,
      amount: minor / 100,
      formattedAmount: `${Math.floor(minor / 100)}.${String(minor % 100).padStart(2, '0')}`,
      status,
      expiresAt:
        toDate(data.expiresAt) ??
        Timestamp.fromMillis(createdAt.getTime() + 30 * 60_000),
      notification: FieldValue.delete(),
      migratedAt: Timestamp.now(),
    };
    if (!ACTIVE.has(status)) update.payment = FieldValue.delete();
    changed += 1;
    console.log(`${apply ? 'UPDATE' : 'WOULD UPDATE'} ${document.ref.path}`);
    if (apply) {
      batch.update(document.ref, update);
      batchSize += 1;
      if (batchSize === 400) {
        await batch.commit();
        batch = db.batch();
        batchSize = 0;
      }
    }
  }
  if (apply && batchSize) await batch.commit();
  return { scanned: snapshot.size, changed, invalid };
}

async function migrate() {
  if (apply && process.env.MIGRATION_ENABLED !== 'true') {
    throw new Error(
      'Set MIGRATION_ENABLED=true before applying this migration.',
    );
  }
  const db = getDb();
  const borrower = await migrateCollection(db, 'payherePayments');
  const boosts = await migrateCollection(db, 'adBoostPayHerePayments');
  console.log(
    JSON.stringify(
      { mode: apply ? 'apply' : 'dry-run', borrower, boosts },
      null,
      2,
    ),
  );
}

if (require.main === module) {
  migrate().catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
}

module.exports = { amountMinor, migrate };
