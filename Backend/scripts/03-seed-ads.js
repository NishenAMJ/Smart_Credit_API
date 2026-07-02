'use strict';

const { getDb } = require('./shared/firebase');
const {
  assertTopLevelDocsExist,
  commitSetWrites,
} = require('./shared/firestore-helpers');
const { buildMockFixtures } = require('./shared/mock-fixtures');

async function seedAds() {
  const db = getDb();
  const fixtures = buildMockFixtures();
  const adCount = fixtures.ads.length;

  await assertTopLevelDocsExist(
    db,
    'users',
    Array.from(new Set(fixtures.ads.map((ad) => ad.lenderId))),
    '03-seed-ads',
  );

  const writes = fixtures.ads.map((ad) => ({
    ref: db.collection('ads').doc(ad.adId),
    data: {
      ...ad,
      id: ad.adId,
      seedBatchId: 'mock_data_ordered_scripts',
      source: 'scripts/mock-data/03-seed-ads.js',
    },
  }));

  await commitSetWrites(db, writes, 'ads');

  console.log(`03 complete: ${adCount} ad documents created.`);
}

if (require.main === module) {
  seedAds().catch((error) => {
    console.error('03-seed-ads failed.');
    console.error(error);
    process.exitCode = 1;
  });
}

module.exports = seedAds;
