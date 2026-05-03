'use strict';

const { getDb } = require('./shared/firebase');
const {
  assertTopLevelDocsExist,
  commitSetWrites,
} = require('./shared/firestore-helpers');
const { buildMockFixtures } = require('./shared/mock-fixtures');

async function seedKycSubmissions() {
  const db = getDb();
  const fixtures = buildMockFixtures();

  await assertTopLevelDocsExist(
    db,
    'users',
    Array.from(new Set(fixtures.kycSubmissions.map((item) => item.userId))),
    '11-seed-kyc-submissions',
  );

  const writes = fixtures.kycSubmissions.map((submission) => ({
    ref: db.collection('kycSubmissions').doc(submission.submissionId),
    data: submission,
  }));

  await commitSetWrites(db, writes, 'kyc submissions');

  console.log('11 complete: KYC submission documents created.');
}

if (require.main === module) {
  seedKycSubmissions().catch((error) => {
    console.error('11-seed-kyc-submissions failed.');
    console.error(error);
    process.exitCode = 1;
  });
}

module.exports = seedKycSubmissions;
