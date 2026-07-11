'use strict';

async function seedInstallmentPayments() {
  console.log(
    '07 skipped: monthly payment state is stored directly on installment documents.',
  );
}

if (require.main === module) {
  seedInstallmentPayments().catch((error) => {
    console.error('07-seed-installment-payments failed.');
    console.error(error);
    process.exitCode = 1;
  });
}

module.exports = seedInstallmentPayments;
