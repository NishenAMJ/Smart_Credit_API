'use strict';

const { getDb } = require('./shared/firebase');
const {
  assertTopLevelDocsExist,
  commitSetWrites,
} = require('./shared/firestore-helpers');
const { buildMockFixtures } = require('./shared/mock-fixtures');

async function seedLoans() {
  const db = getDb();
  const fixtures = buildMockFixtures();

  await assertTopLevelDocsExist(
    db,
    'loanRequests',
    Array.from(new Set(fixtures.loans.map((loan) => loan.requestId))),
    '05-seed-loans',
  );

  await assertTopLevelDocsExist(
    db,
    'ads',
    Array.from(new Set(fixtures.loans.map((loan) => loan.adId))),
    '05-seed-loans',
  );

  await assertTopLevelDocsExist(
    db,
    'users',
    Array.from(
      new Set(
        fixtures.loans.flatMap((loan) => [loan.lenderId, loan.borrowerId]),
      ),
    ),
    '05-seed-loans',
  );

  const writes = fixtures.loans.map((loan) => ({
    ref: db.collection('loans').doc(loan.loanId),
    data: loan,
  }));

  await commitSetWrites(db, writes, 'loans');

  console.log('05 complete: loan documents created.');
}

if (require.main === module) {
  seedLoans().catch((error) => {
    console.error('05-seed-loans failed.');
    console.error(error);
    process.exitCode = 1;
  });
}

module.exports = seedLoans;
