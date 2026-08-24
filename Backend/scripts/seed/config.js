'use strict';

const path = require('path');
const dotenv = require('dotenv');
const { getSeedProfile } = require('./profiles');

dotenv.config({
  path: path.resolve(__dirname, '..', '..', '.env'),
  quiet: true,
});

const DEFAULT_PROFILE = 'history';

const DEFAULTS = Object.freeze({
  profile: DEFAULT_PROFILE,
  randomSeed: 'smart-credit-dev',
  batchId: 'bulk_dev',
  ...getSeedProfile(DEFAULT_PROFILE),
  loginDetailsMode: 'overwrite',
  writeBatchSize: 200,
  writeDelayMs: 100,
  defaultPassword: 'SmartCredit@123',
});

function integerFromEnv(name, fallback) {
  const raw = process.env[name];
  if (raw === undefined || raw === '') return fallback;
  if (!/^\d+$/.test(raw))
    throw new Error(`${name} must be a non-negative integer.`);
  const value = Number(raw);
  if (!Number.isSafeInteger(value)) {
    throw new Error(`${name} must be a safe integer.`);
  }
  return value;
}

function getSeedConfig() {
  const profileName = process.env.SEED_PROFILE || DEFAULTS.profile;
  const profile = getSeedProfile(profileName);
  const config = {
    enabled: process.env.SEED_ENABLED === 'true',
    profile: profileName,
    randomSeed: process.env.SEED_RANDOM_SEED || DEFAULTS.randomSeed,
    batchId: process.env.SEED_BATCH_ID || DEFAULTS.batchId,
    lenderCount: integerFromEnv('SEED_LENDER_COUNT', profile.lenderCount),
    borrowerCount: integerFromEnv(
      'SEED_BORROWER_COUNT',
      profile.borrowerCount,
    ),
    listingCount: integerFromEnv('SEED_LISTING_COUNT', profile.listingCount),
    applicationCount: integerFromEnv(
      'SEED_APPLICATION_COUNT',
      profile.applicationCount,
    ),
    loanCount: integerFromEnv('SEED_LOAN_COUNT', profile.loanCount),
    maxWrites: integerFromEnv('SEED_MAX_WRITES', profile.maxWrites),
    loginDetailsMode:
      process.env.SEED_LOGIN_DETAILS_MODE || DEFAULTS.loginDetailsMode,
    writeBatchSize: integerFromEnv(
      'SEED_WRITE_BATCH_SIZE',
      DEFAULTS.writeBatchSize,
    ),
    writeDelayMs: integerFromEnv('SEED_WRITE_DELAY_MS', DEFAULTS.writeDelayMs),
    defaultPassword:
      process.env.SEED_DEFAULT_PASSWORD || DEFAULTS.defaultPassword,
  };

  if (!config.randomSeed.trim())
    throw new Error('SEED_RANDOM_SEED cannot be empty.');
  if (!/^[a-zA-Z0-9_-]+$/.test(config.batchId)) {
    throw new Error(
      'SEED_BATCH_ID may contain only letters, numbers, underscores, and hyphens.',
    );
  }
  if (config.defaultPassword.length < 8) {
    throw new Error(
      'SEED_DEFAULT_PASSWORD must contain at least 8 characters.',
    );
  }
  if (config.listingCount > 0 && config.lenderCount === 0) {
    throw new Error(
      'SEED_LENDER_COUNT must be positive when listings are requested.',
    );
  }
  if (
    config.applicationCount > 0 &&
    (config.listingCount === 0 || config.borrowerCount === 0)
  ) {
    throw new Error('Applications require at least one listing and borrower.');
  }
  if (config.loanCount > config.applicationCount) {
    throw new Error('SEED_LOAN_COUNT cannot exceed SEED_APPLICATION_COUNT.');
  }
  if (config.maxWrites < 1) {
    throw new Error('SEED_MAX_WRITES must be at least 1.');
  }
  if (
    !new Set(['overwrite', 'if-missing', 'backup', 'none']).has(
      config.loginDetailsMode,
    )
  ) {
    throw new Error(
      'SEED_LOGIN_DETAILS_MODE must be one of: overwrite, if-missing, backup, none.',
    );
  }
  if (config.writeBatchSize < 1 || config.writeBatchSize > 500) {
    throw new Error('SEED_WRITE_BATCH_SIZE must be between 1 and 500.');
  }
  if (config.writeDelayMs > 60000) {
    throw new Error('SEED_WRITE_DELAY_MS cannot exceed 60000.');
  }
  return config;
}

module.exports = { DEFAULTS, getSeedConfig };
