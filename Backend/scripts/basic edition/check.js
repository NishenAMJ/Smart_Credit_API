'use strict';

const { applyBasicSettings } = require('./settings');

applyBasicSettings();

const { buildSchemaV2Fixtures } = require('../bulk edition/fixtures');
const { validateFixtures } = require('../bulk edition/validate');

async function checkBasicSeed() {
  const fixtures = await buildSchemaV2Fixtures(
    new Date('2026-01-15T00:00:00Z'),
  );
  console.log(JSON.stringify(validateFixtures(fixtures), null, 2));
}

checkBasicSeed().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
