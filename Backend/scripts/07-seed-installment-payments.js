'use strict';

const { getDb } = require('./shared/firebase');
const {
  assertInstallmentDocsExist,
  commitSetWrites,
} = require('./shared/firestore-helpers');
const { buildMockFixtures } = require('./shared/mock-fixtures');

async function seedInstallmentPayments() {
  const db = getDb();
  const fixtures = buildMockFixtures();

  await assertInstallmentDocsExist(
    db,
    fixtures.installmentPayments.map((payment) => ({
      loanId: payment.loanId,
      installmentId: payment.installmentId,
    })),
  );

  const writes = fixtures.installmentPayments.map((payment) => ({
    ref: db
      .collection('loans')
      .doc(payment.loanId)
      .collection('installments')
      .doc(payment.installmentId)
      .collection('payments')
      .doc(payment.paymentId),
    data: payment,
  }));

  await commitSetWrites(db, writes, 'installment payments');

  console.log('07 complete: installment payment subcollection documents created.');
}

if (require.main === module) {
  seedInstallmentPayments().catch((error) => {
    console.error('07-seed-installment-payments failed.');
    console.error(error);
    process.exitCode = 1;
  });
}

module.exports = seedInstallmentPayments;
