'use strict';

// This order is intentional: parent and referenced documents are written first.
const collections = [
  require('./general/users'),
  require('./general/auth-credentials'),
  require('./borrowers/documents'),
  require('./borrowers/kyc-submissions'),
  require('./lenders/loan-listings'),
  require('./lenders/loan-applications'),
  require('./general/loans'),
  require('./general/loan-agreements'),
  require('./general/loan-agreement-acceptances'),
  require('./general/installments'),
  require('./general/transactions'),
  require('./general/disputes'),
  require('./general/dispute-events'),
  require('./general/notifications'),
  require('./general/conversations'),
  require('./general/messages'),
  require('./admin/legal-documents'),
  require('./admin/legal-acceptances'),
  require('./general/user-locations'),
  require('./admin/audit-logs'),
];

for (const field of ['fixtureKey', 'path']) {
  const values = collections.map((collection) => collection[field]);
  if (new Set(values).size !== values.length) {
    throw new Error(`Duplicate seed collection ${field} found in registry.`);
  }
}

module.exports = Object.freeze(collections);
