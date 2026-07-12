'use strict';

const { buildSchemaV2Fixtures } = require('./fixtures');
const { validateFixtures } = require('./validate');

async function check() {
  const fixtures = await buildSchemaV2Fixtures(
    new Date('2026-01-15T00:00:00Z'),
  );
  console.log(JSON.stringify(validateFixtures(fixtures), null, 2));
}

check().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
