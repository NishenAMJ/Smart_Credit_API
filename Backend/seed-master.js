'use strict';

const fs = require('fs');
const path = require('path');
const bcrypt = require('bcrypt');
const admin = require('firebase-admin');

const DEFAULT_KEY_PATH = path.resolve(__dirname, 'firebase-service-account.json');

function parseArgs(argv) {
  const options = { key: DEFAULT_KEY_PATH };

  argv.forEach((arg) => {
    if (arg.startsWith('--key=')) {
      options.key = path.resolve(arg.slice('--key='.length));
    }
  });

  return options;
}

function ts(date) {
  return admin.firestore.Timestamp.fromDate(date);
}

function addDays(date, days) {
  const copy = new Date(date.getTime());
  copy.setUTCDate(copy.getUTCDate() + days);
  return copy;
}

function addMonths(date, months) {
  const copy = new Date(date.getTime());
  copy.setUTCMonth(copy.getUTCMonth() + months);
  return copy;
}

async function clearCollection(ref, pageSize = 300) {
  while (true) {
    const snapshot = await ref.limit(pageSize).get();
    if (snapshot.empty) return;

    const batch = ref.firestore.batch();
    snapshot.docs.forEach((doc) => batch.delete(doc.ref));
    await batch.commit();
  }
}

async function clearFirestore(db) {
  console.log('Clearing Firestore...');

  const loansSnapshot = await db.collection('loans').get();
  for (const loanDoc of loansSnapshot.docs) {
    const installmentsSnapshot = await loanDoc.ref.collection('installments').get();
    for (const installmentDoc of installmentsSnapshot.docs) {
      await clearCollection(installmentDoc.ref.collection('payments'));
      await installmentDoc.ref.delete();
    }
    await loanDoc.ref.delete();
  }

  const collectionsToClear = [
    'transactions',
    'repayments',
    'loanRequests',
    'ads',
    'lenderBorrowers',
    'borrowers',
    'users',
    'kycSubmissions',
    'disputes',
    'lenderNotifications',
    'chatMessages',
  ];

  for (const name of collectionsToClear) {
    await clearCollection(db.collection(name));
  }

  console.log('Firestore clear complete.');
}

async function seedRealisticData(db) {
  const now = new Date();

  const accounts = [
    {
      uid: 'lender_001',
      role: ['lender'],
      fullName: 'Kamal Rathnayake',
      email: 'kamal.rathnayake.l01@smartcredit.lk',
      phone: '+94710000073',
      password: 'SmartCredit@123',
      creditScore: 0,
      rating: 4.8,
      totalLoansCompleted: 2,
      totalAmountLent: 510000,
      totalAmountBorrowed: 0,
      kycStatus: 'approved',
      profileComplete: true,
    },
    {
      uid: 'borrower_001',
      role: ['borrower'],
      fullName: 'Amal Perera',
      email: 'amal@gmail.com',
      phone: '+94710003723',
      password: 'Amal@123',
      creditScore: 701,
      rating: 4.4,
      totalLoansCompleted: 1,
      totalAmountLent: 0,
      totalAmountBorrowed: 190000,
      kycStatus: 'approved',
      profileComplete: true,
    },
    {
      uid: 'borrower_nimal_001',
      role: ['borrower'],
      fullName: 'Nimal Perera',
      email: 'nimal@gmail.com',
      phone: '+94771234567',
      password: 'Nimal123',
      creditScore: 742,
      rating: 4.8,
      totalLoansCompleted: 1,
      totalAmountLent: 0,
      totalAmountBorrowed: 360000,
      kycStatus: 'approved',
      profileComplete: true,
    },
    {
      uid: 'admin_001',
      role: ['admin'],
      fullName: 'System Admin',
      email: 'admin@smartcredit.lk',
      phone: '+94770000000',
      password: 'Admin@123',
      creditScore: 0,
      rating: 0,
      totalLoansCompleted: 0,
      totalAmountLent: 0,
      totalAmountBorrowed: 0,
      kycStatus: 'approved',
      profileComplete: true,
    },
  ];

  const userWrites = [];
  for (const account of accounts) {
    const passwordHash = await bcrypt.hash(account.password, 10);
    userWrites.push({
      ref: db.collection('users').doc(account.uid),
      data: {
        uid: account.uid,
        role: account.role,
        fullName: account.fullName,
        photoURL: `https://i.pravatar.cc/300?u=${encodeURIComponent(account.uid)}`,
        phone: account.phone,
        email: account.email,
        emailLower: account.email.toLowerCase(),
        phoneNormalized: account.phone,
        passwordHash,
        creditScore: account.creditScore,
        rating: account.rating,
        totalLoansCompleted: account.totalLoansCompleted,
        totalAmountLent: account.totalAmountLent,
        totalAmountBorrowed: account.totalAmountBorrowed,
        kycStatus: account.kycStatus,
        profileComplete: account.profileComplete,
        accountStatus: 'active',
        authProvider: 'local',
        createdAt: ts(addMonths(now, -6)),
        updatedAt: ts(now),
        lastLoginAt: ts(addDays(now, -1)),
      },
    });
  }

  const borrowerProfiles = [
    {
      userId: 'borrower_001',
      fullName: 'Amal Perera',
      email: 'amal@gmail.com',
      phone: '+94710003723',
      dateOfBirth: '1996-01-20',
      nic: '961205678V',
      address: {
        line1: '118 Temple Road',
        line2: 'Mount Lavinia',
        city: 'Colombo',
        district: 'Colombo',
        province: 'Western',
      },
      employmentStatus: 'employed',
      monthlyIncome: 145000,
      occupation: 'Sales Executive',
      totalLoans: 2,
      activeLoans: 1,
      totalBorrowed: 190000,
      totalRepaid: 76000,
    },
    {
      userId: 'borrower_nimal_001',
      fullName: 'Nimal Perera',
      email: 'nimal@gmail.com',
      phone: '+94771234567',
      dateOfBirth: '1994-06-18',
      nic: '199406180123',
      address: {
        line1: '42 Galle Road',
        line2: 'Colombo 03',
        city: 'Colombo',
        district: 'Colombo',
        province: 'Western',
      },
      employmentStatus: 'self_employed',
      monthlyIncome: 185000,
      occupation: 'Logistics Coordinator',
      totalLoans: 2,
      activeLoans: 1,
      totalBorrowed: 360000,
      totalRepaid: 165600,
    },
  ];

  const borrowerWrites = borrowerProfiles.map((profile) => ({
    ref: db.collection('borrowers').doc(profile.userId),
    data: {
      ...profile,
      profileComplete: true,
      kycVerified: true,
      createdAt: ts(addMonths(now, -5)),
      updatedAt: ts(now),
    },
  }));

  const ads = [
    {
      adId: 'ad_kamal_001',
      lenderId: 'lender_001',
      title: 'Quick personal and emergency loans',
      description: 'Fast approval for verified borrowers in Colombo.',
      minAmount: 50000,
      maxAmount: 350000,
      preferredInterestRate: 14,
      minTenureMonths: 3,
      maxTenureMonths: 18,
      preferredPurposes: ['personal', 'medical'],
      location: 'Colombo',
      status: 'active',
      availableCapital: 1288100,
      applicationCount: 6,
      fundedLoansCount: 5,
      createdAt: ts(addMonths(now, -3)),
      updatedAt: ts(now),
      expiresAt: ts(addMonths(now, 1)),
    },
    {
      adId: 'ad_kamal_002',
      lenderId: 'lender_001',
      title: 'Education and skill-upgrade financing',
      description: 'Flexible monthly plans for education-related funding.',
      minAmount: 30000,
      maxAmount: 200000,
      preferredInterestRate: 12,
      minTenureMonths: 6,
      maxTenureMonths: 24,
      preferredPurposes: ['education'],
      location: 'Gampaha',
      status: 'active',
      availableCapital: 620000,
      applicationCount: 3,
      fundedLoansCount: 2,
      createdAt: ts(addMonths(now, -2)),
      updatedAt: ts(now),
      expiresAt: ts(addMonths(now, 2)),
    },
  ];

  const adWrites = ads.map((ad) => ({
    ref: db.collection('ads').doc(ad.adId),
    data: {
      ...ad,
      id: ad.adId,
      lenderName: 'Kamal Rathnayake',
      lenderPhotoURL: 'https://i.pravatar.cc/300?u=lender_001',
      lenderRating: 4.8,
      isBoosted: false,
      seedBatchId: 'seed_master_realistic',
      source: 'seed_master',
    },
  }));

  const loanRequests = [
    {
      requestId: 'request_amal_active_001',
      adId: 'ad_kamal_001',
      borrowerId: 'borrower_001',
      targetLenderId: 'lender_001',
      amount: 90000,
      tenureMonths: 10,
      loanPurpose: 'personal',
      purposeDescription: 'Household expense consolidation',
      status: 'accepted',
    },
    {
      requestId: 'request_nimal_pending_001',
      adId: 'ad_kamal_002',
      borrowerId: 'borrower_nimal_001',
      targetLenderId: 'lender_001',
      amount: 125000,
      tenureMonths: 12,
      loanPurpose: 'education',
      purposeDescription: 'Professional diploma fees',
      status: 'under_review',
    },
  ];

  const requestWrites = loanRequests.map((request) => ({
    ref: db.collection('loanRequests').doc(request.requestId),
    data: {
      ...request,
      createdAt: ts(addMonths(now, -2)),
      updatedAt: ts(now),
      preferredRepaymentMethod: 'bank_transfer',
      borrowerName:
        request.borrowerId === 'borrower_001' ? 'Amal Perera' : 'Nimal Perera',
      borrowerCreditScore: request.borrowerId === 'borrower_001' ? 701 : 742,
      matchedLenderIds: ['lender_001'],
      urgency: request.status === 'under_review' ? 'medium' : 'high',
    },
  }));

  const activeLoanId = 'loan_amal_active_001';
  const completedLoanId = 'loan_nimal_completed_001';

  const loans = [
    {
      loanId: activeLoanId,
      adId: 'ad_kamal_001',
      requestId: 'request_amal_active_001',
      lenderId: 'lender_001',
      borrowerId: 'borrower_001',
      principalAmount: 90000,
      interestRate: 14,
      tenureMonths: 10,
      monthlyInstallment: 10260,
      totalInterest: 12600,
      outstandingBalance: 71820,
      repaymentsMade: 2,
      status: 'active',
      startDate: ts(addMonths(now, -2)),
      nextDueDate: ts(addDays(now, 6)),
      endDate: ts(addMonths(now, 8)),
      createdAt: ts(addMonths(now, -2)),
      updatedAt: ts(now),
    },
    {
      loanId: completedLoanId,
      adId: 'ad_kamal_002',
      requestId: 'request_nimal_pending_001',
      lenderId: 'lender_001',
      borrowerId: 'borrower_nimal_001',
      principalAmount: 120000,
      interestRate: 12,
      tenureMonths: 6,
      monthlyInstallment: 21200,
      totalInterest: 7200,
      outstandingBalance: 0,
      repaymentsMade: 6,
      status: 'completed',
      startDate: ts(addMonths(now, -8)),
      nextDueDate: null,
      endDate: ts(addMonths(now, -2)),
      createdAt: ts(addMonths(now, -8)),
      updatedAt: ts(addMonths(now, -2)),
    },
  ];

  const loanWrites = loans.map((loan) => ({
    ref: db.collection('loans').doc(loan.loanId),
    data: {
      ...loan,
      borrowerName: loan.borrowerId === 'borrower_001' ? 'Amal Perera' : 'Nimal Perera',
      lenderName: 'Kamal Rathnayake',
      lenderRating: 4.8,
    },
  }));

  const topLevelRepayments = [
    {
      repaymentId: 'repayment_amal_001',
      loanId: activeLoanId,
      borrowerId: 'borrower_001',
      lenderId: 'lender_001',
      amount: 10260,
      principalPaid: 9050,
      interestPaid: 1210,
      paymentMethod: 'bank_transfer',
      status: 'completed',
      installmentNumber: 1,
      dueDate: ts(addMonths(now, -1)),
      paidAt: ts(addMonths(now, -1)),
      createdAt: ts(addMonths(now, -1)),
    },
    {
      repaymentId: 'repayment_amal_002',
      loanId: activeLoanId,
      borrowerId: 'borrower_001',
      lenderId: 'lender_001',
      amount: 10260,
      principalPaid: 9100,
      interestPaid: 1160,
      paymentMethod: 'qr_payment',
      status: 'completed',
      installmentNumber: 2,
      dueDate: ts(addDays(now, -5)),
      paidAt: ts(addDays(now, -3)),
      createdAt: ts(addDays(now, -3)),
    },
  ];

  const repaymentWrites = topLevelRepayments.map((repayment) => ({
    ref: db.collection('repayments').doc(repayment.repaymentId),
    data: repayment,
  }));

  const transactionWrites = topLevelRepayments.map((repayment, index) => ({
    ref: db.collection('transactions').doc(`txn_repay_${index + 1}`),
    data: {
      paymentId: repayment.repaymentId,
      loanId: repayment.loanId,
      amount: repayment.amount,
      createdAt: repayment.createdAt,
      updatedAt: ts(now),
      type: 'repayment',
      status: repayment.status,
      lenderId: repayment.lenderId,
      borrowerId: repayment.borrowerId,
      note:
        index === 0
          ? 'Monthly installment settled by bank transfer.'
          : 'Monthly installment settled via QR payment.',
    },
  }));

  const relationWrites = [
    {
      ref: db.collection('lenderBorrowers').doc('lender_001__borrower_001'),
      data: {
        relationId: 'lender_001__borrower_001',
        lenderId: 'lender_001',
        borrowerId: 'borrower_001',
        lenderName: 'Kamal Rathnayake',
        borrowerName: 'Amal Perera',
        borrowerCreditScore: 701,
        loanIds: [activeLoanId],
        loanRequestIds: ['request_amal_active_001'],
        activeLoanCount: 1,
        completedLoanCount: 0,
        totalLoans: 1,
        totalPrincipalAmount: 90000,
        latestLoanStatus: 'active',
        createdAt: ts(addMonths(now, -2)),
        updatedAt: ts(now),
      },
    },
    {
      ref: db.collection('lenderBorrowers').doc('lender_001__borrower_nimal_001'),
      data: {
        relationId: 'lender_001__borrower_nimal_001',
        lenderId: 'lender_001',
        borrowerId: 'borrower_nimal_001',
        lenderName: 'Kamal Rathnayake',
        borrowerName: 'Nimal Perera',
        borrowerCreditScore: 742,
        loanIds: [completedLoanId],
        loanRequestIds: ['request_nimal_pending_001'],
        activeLoanCount: 0,
        completedLoanCount: 1,
        totalLoans: 1,
        totalPrincipalAmount: 120000,
        latestLoanStatus: 'completed',
        createdAt: ts(addMonths(now, -8)),
        updatedAt: ts(now),
      },
    },
  ];

  const kycWrites = [
    {
      ref: db.collection('kycSubmissions').doc('kyc_borrower_001'),
      data: {
        submissionId: 'kyc_borrower_001',
        userId: 'borrower_001',
        role: 'borrower',
        fullName: 'Amal Perera',
        status: 'approved',
        reviewedBy: 'admin_001',
        reviewedAt: ts(addMonths(now, -2)),
        createdAt: ts(addMonths(now, -3)),
        updatedAt: ts(addMonths(now, -2)),
      },
    },
    {
      ref: db.collection('kycSubmissions').doc('kyc_borrower_nimal_001'),
      data: {
        submissionId: 'kyc_borrower_nimal_001',
        userId: 'borrower_nimal_001',
        role: 'borrower',
        fullName: 'Nimal Perera',
        status: 'approved',
        reviewedBy: 'admin_001',
        reviewedAt: ts(addMonths(now, -4)),
        createdAt: ts(addMonths(now, -5)),
        updatedAt: ts(addMonths(now, -4)),
      },
    },
  ];

  const allWrites = [
    ...userWrites,
    ...borrowerWrites,
    ...adWrites,
    ...requestWrites,
    ...loanWrites,
    ...repaymentWrites,
    ...transactionWrites,
    ...relationWrites,
    ...kycWrites,
  ];

  for (const write of allWrites) {
    await write.ref.set(write.data, { merge: true });
  }

  const loanInstallments = [
    { loanId: activeLoanId, borrowerId: 'borrower_001', paidCount: 2, total: 10, amount: 10260 },
    { loanId: completedLoanId, borrowerId: 'borrower_nimal_001', paidCount: 6, total: 6, amount: 21200 },
  ];

  for (const loanData of loanInstallments) {
    const loanRef = db.collection('loans').doc(loanData.loanId);
    for (let i = 1; i <= loanData.total; i += 1) {
      const dueDate = addMonths(now, i - loanData.paidCount - 1);
      const paid = i <= loanData.paidCount;
      const installmentRef = loanRef.collection('installments').doc(`installment_${String(i).padStart(3, '0')}`);

      await installmentRef.set({
        installmentId: installmentRef.id,
        lenderId: 'lender_001',
        borrowerId: loanData.borrowerId,
        loanId: loanData.loanId,
        installmentNumber: i,
        amount: loanData.amount,
        amountDue: loanData.amount,
        paidAmount: paid ? loanData.amount : 0,
        status: paid ? 'paid' : dueDate < now ? 'overdue' : 'pending',
        dueDate: ts(dueDate),
        createdAt: ts(addMonths(now, -3)),
        updatedAt: ts(now),
      });

      if (paid) {
        const paymentRef = installmentRef.collection('payments').doc(`payment_${String(i).padStart(3, '0')}`);
        await paymentRef.set({
          paymentId: paymentRef.id,
          lenderId: 'lender_001',
          borrowerId: loanData.borrowerId,
          loanId: loanData.loanId,
          installmentId: installmentRef.id,
          amount: loanData.amount,
          paidAmount: loanData.amount,
          paidAt: ts(addDays(dueDate, -2)),
          createdAt: ts(addDays(dueDate, -2)),
          updatedAt: ts(now),
          type: 'repayment',
          paymentType: 'repayment',
          status: 'completed',
          note: 'Auto-seeded realistic repayment record.',
        });
      }
    }
  }

  console.log('Seed complete with realistic lender/borrower/admin dataset.');
  console.log('Lender login:   kamal.rathnayake.l01@smartcredit.lk / SmartCredit@123');
  console.log('Borrower login: amal@gmail.com / Amal@123');
  console.log('Borrower login: nimal@gmail.com / Nimal123');
  console.log('Admin login:    admin@smartcredit.lk / Admin@123');
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const keyPath = options.key;

  if (!fs.existsSync(keyPath)) {
    throw new Error(`Service account file not found: ${keyPath}`);
  }

  if (admin.apps.length === 0) {
    const serviceAccount = require(keyPath);
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
      projectId: serviceAccount.project_id || serviceAccount.projectId,
    });
  }

  const db = admin.firestore();
  await clearFirestore(db);
  await seedRealisticData(db);
}

main().catch((error) => {
  console.error('Seed master failed:', error);
  process.exitCode = 1;
});
