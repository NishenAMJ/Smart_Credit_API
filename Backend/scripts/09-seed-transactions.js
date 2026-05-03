'use strict';

const { getDb } = require('./shared/firebase');
const {
  assertTopLevelDocsExist,
  commitSetWrites,
} = require('./shared/firestore-helpers');
const { buildMockFixtures } = require('./shared/mock-fixtures');

async function seedTransactions() {
  const db = getDb();
  const fixtures = buildMockFixtures();

  await assertTopLevelDocsExist(
    db,
    'loans',
    Array.from(new Set(fixtures.transactions.map((transaction) => transaction.loanId))),
    '09-seed-transactions',
  );

  await assertTopLevelDocsExist(
    db,
    'repayments',
    Array.from(
      new Set(fixtures.transactions.map((transaction) => transaction.paymentId)),
    ),
    '09-seed-transactions',
  );

  const writes = fixtures.transactions.map((transaction) => ({
    ref: db.collection('transactions').doc(transaction.transactionId),
    data: transaction,
  }));

  await commitSetWrites(db, writes, 'transactions');

  console.log('09 complete: transaction documents created.');
}

if (require.main === module) {
  seedTransactions().catch((error) => {
    console.error('09-seed-transactions failed.');
    console.error(error);
    process.exitCode = 1;
  });
}

module.exports = seedTransactions;
