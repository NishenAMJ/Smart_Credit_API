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
  const email = 'nimal@gmail.com';

  console.log(`Inspecting data for ${email}...`);

  const userQuery = await db.collection('users').where('email', '==', email).limit(1).get();
  if (userQuery.empty) {
    console.error('User not found');
    process.exit(1);
  }

  const userDoc = userQuery.docs[0];
  const userData = userDoc.data();
  const userId = userDoc.id;

  console.log('\n== user ==');
  console.log('id:', userId);
  console.log(JSON.stringify(userData, null, 2));

  const borrowerDoc = await db.collection('borrowers').doc(userId).get();
  console.log('\n== borrower profile ==');
  if (borrowerDoc.exists) console.log(JSON.stringify(borrowerDoc.data(), null, 2));
  else console.log('No borrower profile document');

  const loanRequestsSnap = await db.collection('loanRequests').where('borrowerId', '==', userId).get();
  console.log(`\n== loanRequests (${loanRequestsSnap.size}) ==`);
  loanRequestsSnap.forEach((d) => console.log(JSON.stringify({ id: d.id, ...d.data() }, null, 2)));

  const loansSnap = await db.collection('loans').where('borrowerId', '==', userId).get();
  console.log(`\n== loans (${loansSnap.size}) ==`);
  loansSnap.forEach((d) => console.log(JSON.stringify({ id: d.id, ...d.data() }, null, 2)));

  const repaymentsSnap = await db.collection('repayments').where('borrowerId', '==', userId).get();
  console.log(`\n== repayments (${repaymentsSnap.size}) ==`);
  repaymentsSnap.forEach((d) => console.log(JSON.stringify({ id: d.id, ...d.data() }, null, 2)));

  const lenderBorrowerId = `lender_001__${userId}`;
  const lbDoc = await db.collection('lenderBorrowers').doc(lenderBorrowerId).get();
  console.log('\n== lenderBorrower (lender_001 relation) ==');
  if (lbDoc.exists) console.log(JSON.stringify(lbDoc.data(), null, 2));
  else console.log('No lenderBorrower doc for lender_001');

  console.log('\nInspection complete.');
}

main().catch((err) => {
  console.error('Inspector failed:', err);
  process.exit(1);
});
