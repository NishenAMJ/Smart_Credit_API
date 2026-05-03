'use strict';

const { getDb } = require('./shared/firebase');
const {
  assertTopLevelDocsExist,
  commitSetWrites,
} = require('./shared/firestore-helpers');
const { buildMockFixtures } = require('./shared/mock-fixtures');

async function seedRepayments() {
  const db = getDb();
  const fixtures = buildMockFixtures();

  await assertTopLevelDocsExist(
    db,
    'loans',
    Array.from(new Set(fixtures.repayments.map((repayment) => repayment.loanId))),
    '08-seed-repayments',
  );

  const writes = fixtures.repayments.map((repayment) => ({
    ref: db.collection('repayments').doc(repayment.repaymentId),
    data: repayment,
  }));

  await commitSetWrites(db, writes, 'repayments');

  console.log('08 complete: top-level repayment documents created.');
}

if (require.main === module) {
  seedRepayments().catch((error) => {
    console.error('08-seed-repayments failed.');
    console.error(error);
    process.exitCode = 1;
  });
}

module.exports = seedRepayments;
