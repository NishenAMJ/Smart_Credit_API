'use strict';

const { getDb } = require('../../shared/firebase');

const apply = process.argv.includes('--apply');

function normalize(value) {
  return typeof value === 'string'
    ? value
        .normalize('NFKD')
        .replace(/[\u0300-\u036f]/g, '')
        .trim()
        .toLowerCase()
    : '';
}

function tokens(values, maximum = 100) {
  const result = new Set();
  for (const value of values) {
    const normalized = normalize(value);
    if (!normalized) continue;
    result.add(normalized);
    for (const word of normalized.split(/[^a-z0-9@+._-]+/).filter(Boolean)) {
      result.add(word);
      for (let length = 2; length <= Math.min(word.length, 20); length += 1)
        result.add(word.slice(0, length));
      if (result.size >= maximum) return [...result].slice(0, maximum);
    }
  }
  return [...result].slice(0, maximum);
}

function roles(data) {
  const value = data.roles ?? data.role;
  return Array.isArray(value)
    ? value
    : typeof value === 'string'
      ? [value]
      : ['borrower'];
}

function accountStatus(data) {
  if (['active', 'pending', 'suspended', 'closed'].includes(data.accountStatus))
    return data.accountStatus;
  if (data.status === 'inactive' || data.status === 'suspended')
    return 'suspended';
  return data.kycStatus === 'pending' ? 'pending' : 'active';
}

function adminStatus(status) {
  if (['pending_review', 'pending', 'draft'].includes(status)) return 'pending';
  if (status === 'active') return 'active';
  if (status === 'approved') return 'approved';
  if (status === 'rejected') return 'rejected';
  return 'closed';
}

async function processCollection(db, collectionName, buildUpdate) {
  const snapshot = await db.collection(collectionName).get();
  let changed = 0;
  let batch = db.batch();
  let pending = 0;
  for (const doc of snapshot.docs) {
    const update = buildUpdate(doc.id, doc.data());
    if (!update || Object.keys(update).length === 0) continue;
    changed += 1;
    console.log(
      `${apply ? 'BACKFILL' : 'WOULD BACKFILL'} ${collectionName}/${doc.id}`,
    );
    if (!apply) continue;
    batch.set(doc.ref, update, { merge: true });
    pending += 1;
    if (pending === 400) {
      await batch.commit();
      batch = db.batch();
      pending = 0;
    }
  }
  if (apply && pending) await batch.commit();
  return changed;
}

async function main() {
  if (apply && process.env.MIGRATION_ENABLED !== 'true')
    throw new Error('Set MIGRATION_ENABLED=true after reviewing the dry run.');
  const db = getDb();
  let changed = 0;
  changed += await processCollection(db, 'users', (id, data) => {
    const userRoles = roles(data);
    return {
      roles: userRoles,
      primaryRole: userRoles[0],
      accountStatus: accountStatus(data),
      searchTokens: tokens([
        id,
        data.fullName,
        data.email,
        data.phone,
        ...userRoles,
      ]),
    };
  });
  changed += await processCollection(db, 'loanListings', (id, data) => ({
    adminStatus: adminStatus(data.status),
    searchTokens: tokens([
      id,
      data.listingId,
      data.title,
      data.lenderId,
      data.lenderName,
    ]),
  }));
  changed += await processCollection(db, 'disputes', (id, data) => ({
    searchTokens: tokens([
      id,
      data.disputeCode,
      data.loanId,
      data.subject,
      data.borrowerName,
      data.lenderName,
    ]),
  }));
  changed += await processCollection(db, 'loans', (_id, data) => {
    const principalMinor = Number.isFinite(data.principalMinor)
      ? data.principalMinor
      : Math.round(Number(data.principalAmount ?? 0) * 100);
    const interestAmountMinor = Number.isFinite(data.interestAmountMinor)
      ? data.interestAmountMinor
      : Number.isFinite(data.totalInterest)
        ? Math.round(data.totalInterest * 100)
        : Math.max(
            0,
            Math.round(
              (Number(data.totalRepayable ?? 0) -
                Number(data.principalAmount ?? 0)) *
                100,
            ),
          );
    return { principalMinor, interestAmountMinor };
  });
  changed += await processCollection(db, 'transactions', (_id, data) => {
    const amountMinor = Number.isFinite(data.amountMinor)
      ? data.amountMinor
      : Math.round(Number(data.amount ?? 0) * 100);
    const platformFeeMinor = Number.isFinite(data.platformFeeMinor)
      ? data.platformFeeMinor
      : Number.isFinite(data.platformFee)
        ? Math.round(data.platformFee * 100)
        : Number.isFinite(data.fee)
          ? Math.round(data.fee * 100)
          : data.type === 'repayment'
            ? 0
            : Math.round(amountMinor * 0.02);
    return { amountMinor, platformFeeMinor };
  });
  console.log(
    `${apply ? 'Backfilled' : 'Dry run found'} ${changed} documents.`,
  );
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
