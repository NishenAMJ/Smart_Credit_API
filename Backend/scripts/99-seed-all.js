'use strict';

const seedUsers = require('./01-seed-users');
const seedBorrowerProfiles = require('./02-seed-borrower-profiles');
const seedAds = require('./03-seed-ads');
const seedLoanRequests = require('./04-seed-loan-requests');
const seedLoans = require('./05-seed-loans');
const seedInstallments = require('./06-seed-installments');
const seedInstallmentPayments = require('./07-seed-installment-payments');
const seedRepayments = require('./08-seed-repayments');
const seedTransactions = require('./09-seed-transactions');
const seedLenderBorrowers = require('./10-seed-lender-borrowers');
const seedKycSubmissions = require('./11-seed-kyc-submissions');
const seedDisputes = require('./12-seed-disputes');

async function seedAll() {
  await seedUsers();
  await seedBorrowerProfiles();
  await seedAds();
  await seedLoanRequests();
  await seedLoans();
  await seedInstallments();
  await seedInstallmentPayments();
  await seedRepayments();
  await seedTransactions();
  await seedLenderBorrowers();
  await seedKycSubmissions();
  await seedDisputes();

  console.log('99 complete: all ordered mock-data scripts finished successfully.');
}

if (require.main === module) {
  seedAll().catch((error) => {
    console.error('99-seed-all failed.');
    console.error(error);
    process.exitCode = 1;
  });
}

module.exports = seedAll;
