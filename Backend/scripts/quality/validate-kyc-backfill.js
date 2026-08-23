'use strict';

const assert = require('node:assert/strict');
const {
  inferStatus,
  repairedDocumentStatus,
} = require('../operations/migrations/backfill-kyc-consistency');

assert.equal(inferStatus('approved', [{ status: 'rejected' }]), 'approved');
assert.equal(inferStatus('legacy', []), 'not_submitted');
assert.equal(inferStatus('legacy', [{ status: 'rejected' }]), 'rejected');
assert.equal(inferStatus('legacy', [{ status: 'approved' }]), 'approved');
assert.equal(
  inferStatus('legacy', [{ status: 'approved' }, { status: 'pending_review' }]),
  'pending',
);

assert.equal(repairedDocumentStatus('approved', 'pending_review'), 'approved');
assert.equal(repairedDocumentStatus('rejected', 'pending_review'), 'rejected');
assert.equal(repairedDocumentStatus('pending', 'pending_review'), null);
assert.equal(repairedDocumentStatus('approved', 'rejected'), null);
assert.equal(repairedDocumentStatus('pending', 'approved'), null);

// A second pass over a repaired final document is a no-op.
assert.equal(
  repairedDocumentStatus(
    'approved',
    repairedDocumentStatus('approved', 'pending_review'),
  ),
  null,
);

console.log('KYC consistency backfill validation passed.');
