'use strict';

const { buildSchemaV2Fixtures } = require('./fixtures');
const { validateFixtures } = require('./validate');
const { getSeedConfig } = require('./config');

async function check() {
  const config = getSeedConfig();
  const fixtures = await buildSchemaV2Fixtures(
    new Date('2026-01-15T00:00:00Z'),
  );
  const counts = validateFixtures(fixtures);
  if (counts.totalDocuments > config.maxWrites) {
    throw new Error(
      `Seed would write ${counts.totalDocuments} documents, exceeding SEED_MAX_WRITES=${config.maxWrites}.`,
    );
  }
  console.log(JSON.stringify(counts, null, 2));
}

check().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
