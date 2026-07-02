'use strict';

const { getDb } = require('./shared/firebase');
const {
  assertTopLevelDocsExist,
  commitSetWrites,
} = require('./shared/firestore-helpers');
const { buildMockFixtures } = require('./shared/mock-fixtures');

async function seedDisputes() {
  const db = getDb();
  const fixtures = buildMockFixtures();

  await assertTopLevelDocsExist(
    db,
    'transactions',
    Array.from(new Set(fixtures.disputes.map((dispute) => dispute.transactionId))),
    '12-seed-disputes',
  );

  await assertTopLevelDocsExist(
    db,
    'loans',
    Array.from(new Set(fixtures.disputes.map((dispute) => dispute.loanId))),
    '12-seed-disputes',
  );

  const writes = fixtures.disputes.map((dispute) => ({
    ref: db.collection('disputes').doc(dispute.disputeId),
    data: dispute,
  }));

  await commitSetWrites(db, writes, 'disputes');

  console.log('12 complete: dispute documents created.');
}

if (require.main === module) {
  seedDisputes().catch((error) => {
    console.error('12-seed-disputes failed.');
    console.error(error);
    process.exitCode = 1;
  });
}

module.exports = seedDisputes;
