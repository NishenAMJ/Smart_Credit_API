'use strict';

const { getDb } = require('./shared/firebase');
const {
  assertTopLevelDocsExist,
  commitSetWrites,
} = require('./shared/firestore-helpers');
const { buildMockFixtures } = require('./shared/mock-fixtures');

async function seedBorrowerProfiles() {
  const db = getDb();
  const fixtures = buildMockFixtures();

  await assertTopLevelDocsExist(
    db,
    'users',
    fixtures.borrowerProfiles.map((profile) => profile.userId),
    '02-seed-borrower-profiles',
  );

  const writes = fixtures.borrowerProfiles.map((profile) => ({
    ref: db.collection('borrowers').doc(profile.userId),
    data: {
      ...profile,
      profileComplete: true,
      kycVerified: true,
    },
  }));

  await commitSetWrites(db, writes, 'borrower profiles');

  console.log('02 complete: borrower profile documents created.');
}

if (require.main === module) {
  seedBorrowerProfiles().catch((error) => {
    console.error('02-seed-borrower-profiles failed.');
    console.error(error);
    process.exitCode = 1;
  });
}

module.exports = seedBorrowerProfiles;
