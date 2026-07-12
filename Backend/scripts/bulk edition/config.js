'use strict';

const path = require('path');
const dotenv = require('dotenv');

dotenv.config({
  path: path.resolve(__dirname, '..', '..', '.env'),
  quiet: true,
});

const DEFAULTS = Object.freeze({
  randomSeed: 'smart-credit-dev',
  batchId: 'bulk_dev',
  lenderCount: 300,
  borrowerCount: 699,
  listingCount: 600,
  applicationCount: 1500,
  loanCount: 800,
  defaultPassword: 'SmartCredit@123',
});

function integerFromEnv(name, fallback) {
  const raw = process.env[name];
  if (raw === undefined || raw === '') return fallback;
  if (!/^\d+$/.test(raw))
    throw new Error(`${name} must be a non-negative integer.`);
  return Number(raw);
}

function getSeedConfig() {
  const config = {
    enabled: process.env.SEED_ENABLED === 'true',
    randomSeed: process.env.SEED_RANDOM_SEED || DEFAULTS.randomSeed,
    batchId: process.env.SEED_BATCH_ID || DEFAULTS.batchId,
    lenderCount: integerFromEnv('SEED_LENDER_COUNT', DEFAULTS.lenderCount),
    borrowerCount: integerFromEnv(
      'SEED_BORROWER_COUNT',
      DEFAULTS.borrowerCount,
    ),
    listingCount: integerFromEnv('SEED_LISTING_COUNT', DEFAULTS.listingCount),
    applicationCount: integerFromEnv(
      'SEED_APPLICATION_COUNT',
      DEFAULTS.applicationCount,
    ),
    loanCount: integerFromEnv('SEED_LOAN_COUNT', DEFAULTS.loanCount),
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
  return config;
}

module.exports = { DEFAULTS, getSeedConfig };
