'use strict';

const SEED_PROFILES = Object.freeze({
  basic: Object.freeze({
    description: 'A compact smoke-test dataset for local development.',
    lenderCount: 5,
    borrowerCount: 10,
    listingCount: 8,
    applicationCount: 15,
    loanCount: 8,
    maxWrites: 5000,
  }),
  history: Object.freeze({
    description: 'A few accounts with deep application and loan history.',
    lenderCount: 2,
    borrowerCount: 3,
    listingCount: 12,
    applicationCount: 36,
    loanCount: 18,
    maxWrites: 5000,
  }),
  volume: Object.freeze({
    description: 'Many accounts for list, pagination, and performance testing.',
    lenderCount: 30,
    borrowerCount: 70,
    listingCount: 60,
    applicationCount: 150,
    loanCount: 80,
    maxWrites: 5000,
  }),
});

function getSeedProfile(name) {
  const profile = SEED_PROFILES[name];
  if (!profile) {
    throw new Error(
      `Unknown SEED_PROFILE "${name}". Choose one of: ${Object.keys(SEED_PROFILES).join(', ')}.`,
    );
  }
  return profile;
}

module.exports = { SEED_PROFILES, getSeedProfile };
