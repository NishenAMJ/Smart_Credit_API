'use strict';

const { applyBasicSettings } = require('./settings');

applyBasicSettings();

const { runSeed } = require('../bulk edition/run');

runSeed().catch((error) => {
  console.error('Basic database seed failed.');
  console.error(error);
  process.exitCode = 1;
});
