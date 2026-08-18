'use strict';

// This order is intentional: parent and referenced documents are written first.
const collections = [
  require('./users'),
  require('./auth-credentials'),
  require('./documents'),
  require('./kyc-submissions'),
  require('./loan-listings'),
  require('./loan-applications'),
  require('./loans'),
  require('./loan-agreements'),
  require('./loan-agreement-acceptances'),
  require('./installments'),
  require('./transactions'),
  require('./disputes'),
  require('./dispute-events'),
  require('./notifications'),
  require('./conversations'),
  require('./messages'),
  require('./legal-documents'),
  require('./legal-acceptances'),
  require('./user-locations'),
  require('./audit-logs'),
];

for (const field of ['fixtureKey', 'path']) {
  const values = collections.map((collection) => collection[field]);
  if (new Set(values).size !== values.length) {
    throw new Error(`Duplicate seed collection ${field} found in registry.`);
  }
}

module.exports = Object.freeze(collections);
