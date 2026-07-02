'use strict';

const { getDb } = require('./shared/firebase');
const {
  assertTopLevelDocsExist,
  commitSetWrites,
} = require('./shared/firestore-helpers');
const { buildMockFixtures } = require('./shared/mock-fixtures');

async function seedLenderBorrowers() {
  const db = getDb();
  const fixtures = buildMockFixtures();

  await assertTopLevelDocsExist(
    db,
    'loans',
    fixtures.lenderBorrowers.flatMap((relation) => relation.loanIds),
    '10-seed-lender-borrowers',
  );

  const writes = fixtures.lenderBorrowers.map((relation) => ({
    ref: db.collection('lenderBorrowers').doc(relation.relationId),
    data: relation,
  }));

  await commitSetWrites(db, writes, 'lenderBorrowers');

  console.log('10 complete: lenderBorrowers relationship documents created.');
}

if (require.main === module) {
  seedLenderBorrowers().catch((error) => {
    console.error('10-seed-lender-borrowers failed.');
    console.error(error);
    process.exitCode = 1;
  });
}

module.exports = seedLenderBorrowers;
