/**
 * Targeted borrower data seed for amal@gmail.com (borrower_001)
 * Adds: transactions, notifications, and a pending loan request
 *
 * Run with:  node seed-borrower-amal.js
 * Optional:  node seed-borrower-amal.js --key=./firebase-service-account.json
 */

'use strict';

const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');

const DEFAULT_KEY_PATH = './firebase-service-account.json';
const BORROWER_ID = 'borrower_001';
const MAX_BATCH_SIZE = 400;

function parseArgs(argv) {
  let key = DEFAULT_KEY_PATH;
  argv.forEach((arg) => { if (arg.startsWith('--key=')) key = arg.slice(6); });
  return { key };
}

function ts(date) { return admin.firestore.Timestamp.fromDate(date); }
function daysAgo(n) { const d = new Date(); d.setDate(d.getDate() - n); return d; }
function pad(n, len) { return String(n).padStart(len, '0'); }

async function commitBatch(db, writes, label) {
  let batch = db.batch();
  let count = 0;
  let batchNum = 0;
  for (let i = 0; i < writes.length; i++) {
    batch.set(writes[i].ref, writes[i].data);
    count++;
    if (count === MAX_BATCH_SIZE || i === writes.length - 1) {
      batchNum++;
      await batch.commit();
      console.log(`  Committed ${label} batch ${batchNum} (${count} writes)`);
      batch = db.batch();
      count = 0;
    }
  }
}

async function main() {
  const { key } = parseArgs(process.argv.slice(2));
  const keyPath = path.isAbsolute(key) ? key : path.resolve(process.cwd(), key);
  const serviceAccount = JSON.parse(fs.readFileSync(keyPath, 'utf8'));

  admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
  const db = admin.firestore();

  console.log('Fetching borrower_001 and their loans...');

  // ─── 1. Fetch borrower_001 ───────────────────────────────────────────────
  const borrowerSnap = await db.collection('users').doc(BORROWER_ID).get();
  if (!borrowerSnap.exists) {
    console.error('borrower_001 not found. Run the main seed first.');
    process.exit(1);
  }
  const borrower = borrowerSnap.data();
  console.log('Borrower:', borrower.fullName, '|', borrower.email);

  // ─── 2. Fetch active loans for this borrower ──────────────────────────────
  const loansSnap = await db
    .collection('loans')
    .where('borrowerId', '==', BORROWER_ID)
    .where('status', '==', 'active')
    .limit(3)
    .get();

  if (loansSnap.empty) {
    console.log('No active loans found for borrower_001.');
  }

  const loans = loansSnap.docs.map((d) => ({ id: d.id, ...d.data() }));

  // ─── 3. Add transactions (repayment receipts) ─────────────────────────────
  console.log('\nAdding transactions...');
  const txnWrites = [];
  const PAYMENT_TYPES = ['qr', 'receipt', 'manual'];
  const STATUSES = ['completed', 'completed', 'completed', 'pending'];

  loans.forEach((loan, li) => {
    for (let i = 1; i <= 4; i++) {
      const ref = db.collection('transactions').doc();
      const daysOff = li * 10 + i * 7;
      const paidAt = daysAgo(daysOff);
      const status = STATUSES[i % STATUSES.length];
      const amount = Math.round((loan.monthlyInstallment ?? loan.loanAmount / loan.loanTermMonths ?? 5000) * (0.9 + Math.random() * 0.2));
      txnWrites.push({
        ref,
        data: {
          transactionId: ref.id,
          loanId: loan.loanId ?? loan.id,
          lenderId: loan.lenderId,
          borrowerId: BORROWER_ID,
          borrowerName: borrower.fullName,
          lenderName: loan.borrowerName ?? 'Lender',   // seed stores lender info as borrowerName on loan
          amount,
          type: 'repayment',
          paymentType: PAYMENT_TYPES[i % PAYMENT_TYPES.length],
          status,
          description: `Installment repayment #${i} for loan ${String(loan.loanId ?? loan.id).slice(0, 8)}`,
          receiptURL: i % 3 === 0 ? `https://example.com/receipts/${ref.id}.jpg` : '',
          verifiedByLender: status === 'completed',
          paidAt: ts(paidAt),
          createdAt: ts(paidAt),
        },
      });
    }
  });

  // Also add 2 disbursement transactions (lender → borrower)
  loans.slice(0, 2).forEach((loan, li) => {
    const principal = loan.loanAmount ?? 0;
    const ref = db.collection('transactions').doc();
    const disbursedAt = daysAgo(100 + li * 20);
    txnWrites.push({
      ref,
      data: {
        transactionId: ref.id,
        loanId: loan.loanId ?? loan.id,
        lenderId: loan.lenderId,
        borrowerId: BORROWER_ID,
        borrowerName: borrower.fullName,
        amount: principal,
        type: 'disbursement',
        paymentType: 'manual',
        status: 'completed',
        description: `Loan disbursement - ${principal.toLocaleString()} LKR`,
        receiptURL: '',
        verifiedByLender: true,
        paidAt: ts(disbursedAt),
        createdAt: ts(disbursedAt),
      },
    });
  });

  await commitBatch(db, txnWrites, 'transactions');
  console.log(`  Created ${txnWrites.length} transactions`);

  // ─── 4. Add notifications ─────────────────────────────────────────────────
  console.log('\nAdding notifications...');
  const notifications = [
    { title: 'Payment Due Soon', body: 'Your installment of LKR 12,500 is due in 3 days.', type: 'reminder', daysAgo: 1 },
    { title: 'Payment Confirmed', body: 'Your repayment has been verified by the lender. Thank you!', type: 'success', daysAgo: 7 },
    { title: 'New Ad Available', body: 'A lender matching your profile has posted a new offer at 12% interest.', type: 'info', daysAgo: 10 },
    { title: 'KYC Approved', body: 'Your KYC verification has been approved. You can now apply for loans.', type: 'success', daysAgo: 30 },
    { title: 'Loan Request Accepted', body: 'Your loan request of LKR 150,000 has been accepted.', type: 'success', daysAgo: 45 },
  ];

  const notifWrites = notifications.map(({ title, body, type, daysAgo: ago }) => {
    const ref = db.collection('notifications').doc();
    const createdAt = daysAgo(ago);
    return {
      ref,
      data: {
        notificationId: ref.id,
        userId: BORROWER_ID,
        title,
        body,
        type,
        read: ago > 7,
        createdAt: ts(createdAt),
        updatedAt: ts(createdAt),
      },
    };
  });

  await commitBatch(db, notifWrites, 'notifications');
  console.log(`  Created ${notifWrites.length} notifications`);

  // ─── 5. Update borrower aggregate stats ──────────────────────────────────
  console.log('\nUpdating borrower_001 aggregate stats...');
  const totalBorrowed = loans.reduce((sum, l) => sum + (l.loanAmount ?? 0), 0);
  const totalRepayable = loans.reduce((sum, l) => sum + (l.totalRepayable ?? 0), 0);
  await db.collection('users').doc(BORROWER_ID).update({
    totalAmountBorrowed: totalBorrowed,
    creditScore: 720,
    rating: 4.5,
    updatedAt: ts(new Date()),
  });
  console.log(`  Updated: totalAmountBorrowed=${totalBorrowed}, creditScore=720, rating=4.5`);

  console.log('\n✅ Borrower seed complete!');
  console.log(`   Email:    ${borrower.email}`);
  console.log(`   Password: Amal@123`);
  console.log(`   Loans:    ${loans.length} active (${totalBorrowed.toLocaleString()} LKR)`);
  console.log(`   Txns:     ${txnWrites.length} added`);
  console.log(`   Notifs:   ${notifWrites.length} added`);

  process.exit(0);
}

main().catch((err) => { console.error(err); process.exit(1); });
