'use strict';

const path = require('path');
const dotenv = require('dotenv');

dotenv.config({
  path: path.resolve(__dirname, '..', '..', '.env'),
  quiet: true,
});

function applyBasicSettings() {
  process.env.SEED_RANDOM_SEED =
    process.env.BASIC_SEED_RANDOM_SEED || 'smart-credit-basic';
  process.env.SEED_BATCH_ID = process.env.BASIC_SEED_BATCH_ID || 'basic_dev';
  process.env.SEED_LENDER_COUNT = process.env.BASIC_SEED_LENDER_COUNT || '5';
  process.env.SEED_BORROWER_COUNT =
    process.env.BASIC_SEED_BORROWER_COUNT || '10';
  process.env.SEED_LISTING_COUNT = process.env.BASIC_SEED_LISTING_COUNT || '8';
  process.env.SEED_APPLICATION_COUNT =
    process.env.BASIC_SEED_APPLICATION_COUNT || '15';
  process.env.SEED_LOAN_COUNT = process.env.BASIC_SEED_LOAN_COUNT || '8';
  if (process.env.BASIC_SEED_DEFAULT_PASSWORD) {
    process.env.SEED_DEFAULT_PASSWORD = process.env.BASIC_SEED_DEFAULT_PASSWORD;
  }
}

module.exports = { applyBasicSettings };
