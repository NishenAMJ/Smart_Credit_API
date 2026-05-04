'use strict';

const { getDb } = require('./shared/firebase');
const {
  assertTopLevelDocsExist,
  commitSetWrites,
} = require('./shared/firestore-helpers');
const { buildMockFixtures } = require('./shared/mock-fixtures');

async function seedLoanRequests() {
  const db = getDb();
  const fixtures = buildMockFixtures();

  await assertTopLevelDocsExist(
    db,
    'ads',
    Array.from(new Set(fixtures.loanRequests.map((request) => request.adId))),
    '04-seed-loan-requests',
  );

  await assertTopLevelDocsExist(
    db,
    'users',
    Array.from(
      new Set(
        fixtures.loanRequests.flatMap((request) => [
          request.borrowerId,
          request.targetLenderId,
        ]),
      ),
    ),
    '04-seed-loan-requests',
  );

  const writes = fixtures.loanRequests.map((request) => ({
    ref: db.collection('loanRequests').doc(request.requestId),
    data: request,
  }));

  await commitSetWrites(db, writes, 'loan requests');

  console.log('04 complete: loan request documents created.');
}

if (require.main === module) {
  seedLoanRequests().catch((error) => {
    console.error('04-seed-loan-requests failed.');
    console.error(error);
    process.exitCode = 1;
  });
}

module.exports = seedLoanRequests;
