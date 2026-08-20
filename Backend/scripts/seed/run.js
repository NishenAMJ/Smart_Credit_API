'use strict';

const { getDb } = require('../shared/firebase');
const { buildSchemaV2Fixtures } = require('./fixtures');
const { validateFixtures } = require('./validate');
const { getSeedConfig } = require('./config');
const { writeLoginDetails } = require('./login-details');
const collections = require('./collections');

async function runSeed() {
  const config = getSeedConfig();
  if (!config.enabled) {
    throw new Error(
      'Firestore seed writes are disabled. Set SEED_ENABLED=true in Backend/.env after verifying the Firebase project.',
    );
  }
  const fixtures = await buildSchemaV2Fixtures();
  const counts = validateFixtures(fixtures);
  if (counts.totalDocuments > config.maxWrites) {
    throw new Error(
      `Seed would write ${counts.totalDocuments} documents, exceeding SEED_MAX_WRITES=${config.maxWrites}. Reduce the record counts or explicitly raise the guard after checking the Firebase quota.`,
    );
  }
  writeLoginDetails(fixtures, config);
  console.log(
    `Validated ${counts.totalDocuments} documents. Writing batches of at most ${config.writeBatchSize} with ${config.writeDelayMs}ms between batches.`,
  );

  const writeOptions = {
    batchSize: config.writeBatchSize,
    delayMs: config.writeDelayMs,
  };
  const db = getDb();

  for (const collection of collections) {
    await collection.write({ db, fixtures, writeOptions });
  }

  console.log('Database seed complete. Validation counts:');
  console.log(JSON.stringify(counts, null, 2));
}

if (require.main === module) {
  runSeed().catch((error) => {
    console.error('Database seed failed.');
    console.error(error);
    process.exitCode = 1;
  });
}

module.exports = { runSeed };
