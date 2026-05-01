'use strict';

const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');

function parseArgs(argv) {
  const options = { key: path.resolve(__dirname, 'firebase-service-account.json') };
  argv.forEach((arg) => {
    if (arg.startsWith('--key=')) options.key = path.resolve(arg.slice('--key='.length));
  });
  return options;
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const keyPath = options.key;

  if (!fs.existsSync(keyPath)) {
    console.error('Service account file not found:', keyPath);
    process.exit(1);
  }

  const serviceAccount = require(keyPath);
  if (admin.apps.length === 0) {
    admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
  }

  const db = admin.firestore();

  console.log('🚀 Seeding realistic data for nimal@gmail.com (Mahinsa schema)...');

  const userQuery = await db.collection('users').where('email', '==', 'nimal@gmail.com').limit(1).get();
  if (userQuery.empty) {
    console.error('❌ User nimal@gmail.com not found. Ensure the user exists first.');
    process.exit(1);
  }

  const userDoc = userQuery.docs[0];
  const userId = userDoc.id;
  const batch = db.batch();

  // Only update borrower-specific fields; do not touch auth/password fields.
  const profileUpdate = {
    nic: '199512345678',
    dateOfBirth: '1995-05-20',
    address: {
      line1: 'No. 45, Temple Road',
      city: 'Galle',
      district: 'Galle',
      province: 'Southern',
    },
    employmentStatus: 'employed',
    monthlyIncome: 75000,
    occupation: 'Software Quality Assurance Engineer',
    profileComplete: true,
    kycVerified: true,
    creditScore: 720,
    updatedAt: admin.firestore.Timestamp.now(),
  };

  batch.update(userDoc.ref, profileUpdate);

  // Create loan request
  const requestRef = db.collection('loanRequests').doc();
  const loanRequest = {
    requestId: requestRef.id,
    borrowerId: userId,
    borrowerName: userDoc.data().fullName || 'Nimal Perera',
    amount: 150000,
    loanPurpose: 'education',
    tenureMonths: 24,
    preferredInterestRate: 12.5,
    status: 'pending',
    borrowerCreditScore: 720,
    createdAt: admin.firestore.Timestamp.now(),
    source: 'seed_nimal_mahinsa',
  };
  batch.set(requestRef, loanRequest);

  // Create an active loan record
  const loanRef = db.collection('loans').doc();
  const startDate = new Date('2026-04-01');
  const loan = {
    loanId: loanRef.id,
    requestId: requestRef.id,
    borrowerId: userId,
    lenderId: 'lender_882',
    principalAmount: 150000,
    interestRate: 12.5,
    tenureMonths: 24,
    totalRepayable: 187500,
    outstandingBalance: 187500,
    status: 'active',
    disbursedAt: admin.firestore.Timestamp.fromDate(startDate),
    nextDueDate: admin.firestore.Timestamp.fromDate(new Date('2026-05-01')),
    repaymentsMade: 0,
    createdAt: admin.firestore.Timestamp.now(),
    source: 'seed_nimal_mahinsa',
  };
  batch.set(loanRef, loan);

  await batch.commit();
  console.log('✅ Real-world data sync complete for Nimal (Mahinsa).');
}

main().catch((err) => {
  console.error('Seeder failed:', err);
  process.exit(1);
});
