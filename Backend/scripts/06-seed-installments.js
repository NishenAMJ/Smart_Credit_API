'use strict';

const { getDb } = require('./shared/firebase');
const {
  assertTopLevelDocsExist,
  commitSetWrites,
} = require('./shared/firestore-helpers');
const { buildMockFixtures } = require('./shared/mock-fixtures');

async function seedInstallments() {
  const db = getDb();
  const fixtures = buildMockFixtures();

  await assertTopLevelDocsExist(
    db,
    'loans',
    Array.from(
      new Set(fixtures.installments.map((installment) => installment.loanId)),
    ),
    '06-seed-installments',
  );

  const writes = fixtures.installments.map((installment) => ({
    ref: db
      .collection('loans')
      .doc(installment.loanId)
      .collection('installments')
      .doc(installment.installmentId),
    data: {
      ...installment,
      lastPaymentAt: installment.paidAmount > 0 ? installment.updatedAt : null,
      note:
        installment.paidAmount > 0
          ? 'Seeded monthly installment payment.'
          : null,
    },
  }));

  await commitSetWrites(db, writes, 'installments');

  console.log('06 complete: loan installment subcollection documents created.');
}

if (require.main === module) {
  seedInstallments().catch((error) => {
    console.error('06-seed-installments failed.');
    console.error(error);
    process.exitCode = 1;
  });
}

module.exports = seedInstallments;
