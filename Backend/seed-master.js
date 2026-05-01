'use strict';

const { spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const bcrypt = require('bcrypt');
const admin = require('firebase-admin');

const DEFAULT_KEY_PATH = path.resolve(__dirname, 'firebase-service-account.json');
const BASE_SEED_SCRIPT = path.resolve(
  __dirname,
  'seed-mock-data-with-lenderborrowers.js',
);

const BORROWER_ID = 'borrower_nimal_001';
const LENDER_ID = 'lender_001';
const EMAIL = 'nimal@gmail.com';
const PASSWORD = 'Nimal123';
const FULL_NAME = 'Nimal Perera';
const PHONE = '0771234567';
const PHONE_NORMALIZED = '+94771234567';

function parseArgs(argv) {
  const options = { key: DEFAULT_KEY_PATH, skipBase: false };

  argv.forEach((arg) => {
    if (arg.startsWith('--key=')) {
      options.key = path.resolve(arg.slice('--key='.length));
    } else if (arg === '--skip-base') {
      options.skipBase = true;
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

function roundCurrency(value) {
  return Math.round(value / 100) * 100;
}

function buildSearchKeywords(values) {
  return Array.from(
    new Set(
      values
        .flatMap((value) => String(value ?? '').toLowerCase().split(/[^a-z0-9]+/))
        .filter((token) => token.length > 1),
    ),
  );
}

async function writeSpecialBorrowerData(db, now) {
  const lenderDoc = await db.collection('users').doc(LENDER_ID).get();
  const lenderData = lenderDoc.exists ? lenderDoc.data() : null;
  const lenderName = lenderData?.fullName ?? 'Kamal Rathnayake';
  const lenderPhotoURL = lenderData?.photoURL ?? '';
  const lenderRating =
    typeof lenderData?.rating === 'number' ? lenderData.rating : 4.8;

  const passwordHash = await bcrypt.hash(PASSWORD, 10);
  const borrowerPhotoURL = `https://i.pravatar.cc/300?u=${encodeURIComponent(
    BORROWER_ID,
  )}`;

  const activePrincipal = 240000;
  const activeInterestRate = 14;
  const activeTenureMonths = 12;
  const activeTotalRepayable = roundCurrency(
    activePrincipal +
      (activePrincipal * activeInterestRate * activeTenureMonths) / 1200,
  );
  const activeMonthlyInstallment = Math.round(
    activeTotalRepayable / activeTenureMonths,
  );
  const activeStartDate = addMonths(now, -2);

  const completedPrincipal = 120000;
  const completedInterestRate = 12;
  const completedTenureMonths = 3;
  const completedTotalRepayable = roundCurrency(
    completedPrincipal +
      (completedPrincipal * completedInterestRate * completedTenureMonths) / 1200,
  );
  const completedMonthlyInstallment = Math.round(
    completedTotalRepayable / completedTenureMonths,
  );
  const completedStartDate = addMonths(now, -5);

  const borrowerUserDoc = {
    uid: BORROWER_ID,
    role: ['borrower'],
    fullName: FULL_NAME,
    photoURL: borrowerPhotoURL,
    phone: PHONE,
    email: EMAIL,
    emailLower: EMAIL.toLowerCase(),
    phoneNormalized: PHONE_NORMALIZED,
    passwordHash,
    creditScore: 742,
    rating: 4.8,
    totalLoansCompleted: 1,
    totalAmountLent: 0,
    totalAmountBorrowed: activePrincipal + completedPrincipal,
    kycStatus: 'approved',
    accountStatus: 'active',
    authProvider: 'local',
    incomeVerified: true,
    createdAt: ts(addDays(now, -120)),
    updatedAt: ts(addDays(now, -2)),
    lastLoginAt: ts(now),
  };

  const borrowerProfileDoc = {
    userId: BORROWER_ID,
    fullName: FULL_NAME,
    email: EMAIL,
    phone: PHONE,
    photoURL: borrowerPhotoURL,
    dateOfBirth: '1994-06-18',
    nic: '199406180123',
    address: {
      line1: '42 Galle Road',
      line2: 'Colombo 03',
      city: 'Colombo',
      district: 'Colombo',
      province: 'Western',
    },
    employmentStatus: 'salaried',
    monthlyIncome: 185000,
    occupation: 'Operations Coordinator',
    employer: {
      name: 'Horizon Logistics (Pvt) Ltd',
      industry: 'Logistics and Supply Chain',
      position: 'Operations Coordinator',
      startDate: ts(addMonths(now, -36)),
      address: 'No. 12, Industrial Estate, Koggala Road, Colombo',
      hrContact: {
        name: 'Samantha Wijesinghe',
        phone: '+94771200011',
        email: 'samantha.w@horizonlogistics.lk',
      },
    },
    bankAccounts: [
      {
        bankName: 'Sampath Bank',
        accountName: FULL_NAME,
        maskedAccount: '****1234',
        branch: 'Colombo 3',
        currency: 'LKR',
      },
      {
        bankName: 'Commercial Bank of Ceylon',
        accountName: FULL_NAME,
        maskedAccount: '****5678',
        branch: 'Colombo 7',
        currency: 'LKR',
      },
    ],
    creditScore: 742,
    profileComplete: true,
    kycVerified: true,
    totalLoans: 2,
    activeLoans: 1,
    totalBorrowed: activePrincipal + completedPrincipal,
    totalRepaid: completedTotalRepayable + activeMonthlyInstallment * 2,
    creditReport: {
      lastUpdated: ts(addDays(now, -10)),
      enquiriesLast12Months: 1,
      debtToIncomeRatio: 0.42,
      scoreBreakdown: {
        paymentHistory: 78,
        creditUtilization: 65,
        lengthOfHistory: 80,
        newCredit: 90,
        creditMix: 85,
      },
    },
    contactReferences: [
      { name: 'Amal Perera', relation: 'Brother', phone: '+94771234568' },
      { name: 'Nadeesha Silva', relation: 'Colleague', phone: '+94771234569' },
    ],
    createdAt: ts(addDays(now, -110)),
    updatedAt: ts(now),
  };

  const pendingAdId = 'nimal_pending_ad_001';
  const activeAdId = 'nimal_active_ad_001';
  const completedAdId = 'nimal_completed_ad_001';
  const pendingRequestId = 'nimal_request_pending_001';
  const activeRequestId = 'nimal_request_active_001';
  const completedRequestId = 'nimal_request_completed_001';
  const activeLoanId = 'nimal_loan_active_001';
  const completedLoanId = 'nimal_loan_completed_001';

  const sharedAdData = (
    adId,
    amount,
    interestRate,
    tenureMonths,
    createdAt,
    purpose,
    title,
    description,
    applicationCount,
    fundedLoansCount,
  ) => {
    const minAmount = Math.max(10000, Math.round(amount * 0.4));
    const location = 'Colombo';

    return {
      id: adId,
      adId,
      lenderId: LENDER_ID,
      title,
      description,
      minAmount,
      maxAmount: amount,
      preferredInterestRate: interestRate,
      minTenureMonths: Math.min(6, tenureMonths),
      maxTenureMonths: tenureMonths,
      preferredPurposes: [purpose],
      location,
      status: 'active',
      isBoosted: false,
      availableCapital: amount,
      applicationCount,
      fundedLoansCount,
      responseTimeHours: 12,
      createdAt: ts(createdAt),
      updatedAt: ts(now),
      expiresAt: ts(addDays(createdAt, 180)),
      lenderName,
      lenderPhotoURL,
      lenderRating,
      searchKeywords: buildSearchKeywords([
        lenderName,
        location,
        title,
        description,
        purpose,
      ]),
      seedBatchId: 'seed_master_nimal',
      source: 'seed_master',
    };
  };

  const pendingRequestDoc = {
    requestId: pendingRequestId,
    adId: pendingAdId,
    targetLenderId: LENDER_ID,
    borrowerId: BORROWER_ID,
    amount: 90000,
    tenureMonths: 6,
    loanPurpose: 'medical',
    purpose: 'medical',
    purposeCategory: 'medical',
    purposeDescription: 'Short-term medical expense support',
    status: 'open',
    suggestedInterestRate: 15.5,
    urgency: 'high',
    monthlyIncome: borrowerProfileDoc.monthlyIncome,
    incomeSource: borrowerProfileDoc.employmentStatus,
    requestedRegion: 'Colombo',
    collateralOffered: false,
    matchedLenderIds: [LENDER_ID],
    notes: 'Nimal is requesting a quick medical loan and prefers QR repayment.',
    createdAt: ts(addDays(now, -3)),
    updatedAt: ts(now),
    borrowerName: FULL_NAME,
    borrowerPhotoURL,
    borrowerRating: 4.8,
    borrowerCreditScore: 742,
    preferredRepaymentMethod: 'qr_payment',
  };

  const activeRequestDoc = {
    requestId: activeRequestId,
    adId: activeAdId,
    targetLenderId: LENDER_ID,
    borrowerId: BORROWER_ID,
    amount: activePrincipal,
    tenureMonths: activeTenureMonths,
    loanPurpose: 'personal',
    purpose: 'personal',
    purposeCategory: 'personal',
    purposeDescription: 'Personal expense consolidation',
    status: 'accepted',
    suggestedInterestRate: activeInterestRate,
    urgency: 'medium',
    monthlyIncome: borrowerProfileDoc.monthlyIncome,
    incomeSource: borrowerProfileDoc.employmentStatus,
    requestedRegion: 'Colombo',
    collateralOffered: false,
    matchedLenderIds: [LENDER_ID],
    notes: 'Accepted request converted into an active loan.',
    createdAt: ts(addDays(now, -75)),
    updatedAt: ts(addDays(now, -70)),
    borrowerName: FULL_NAME,
    borrowerPhotoURL,
    borrowerRating: 4.8,
    borrowerCreditScore: 742,
    preferredRepaymentMethod: 'bank_transfer',
  };

  const completedRequestDoc = {
    requestId: completedRequestId,
    adId: completedAdId,
    targetLenderId: LENDER_ID,
    borrowerId: BORROWER_ID,
    amount: completedPrincipal,
    tenureMonths: completedTenureMonths,
    loanPurpose: 'education',
    purpose: 'education',
    purposeCategory: 'education',
    purposeDescription: 'Professional certificate course fees',
    status: 'accepted',
    suggestedInterestRate: completedInterestRate,
    urgency: 'low',
    monthlyIncome: borrowerProfileDoc.monthlyIncome,
    incomeSource: borrowerProfileDoc.employmentStatus,
    requestedRegion: 'Colombo',
    collateralOffered: false,
    matchedLenderIds: [LENDER_ID],
    notes: 'Accepted request for a loan that has since been completed.',
    createdAt: ts(addDays(now, -170)),
    updatedAt: ts(addDays(now, -165)),
    borrowerName: FULL_NAME,
    borrowerPhotoURL,
    borrowerRating: 4.8,
    borrowerCreditScore: 742,
    preferredRepaymentMethod: 'card',
  };

  const activeLoanDoc = {
    loanId: activeLoanId,
    adId: activeAdId,
    requestId: activeRequestId,
    lenderId: LENDER_ID,
    borrowerId: BORROWER_ID,
    principalAmount: activePrincipal,
    interestRate: activeInterestRate,
    tenureMonths: activeTenureMonths,
    monthlyInstallment: activeMonthlyInstallment,
    outstandingBalance: activeTotalRepayable - activeMonthlyInstallment * 2,
    totalInterest: activeTotalRepayable - activePrincipal,
    status: 'active',
    startDate: ts(activeStartDate),
    nextDueDate: ts(addDays(now, 8)),
    endDate: ts(addMonths(activeStartDate, activeTenureMonths)),
    repaymentsMade: 2,
    createdAt: ts(addDays(activeStartDate, -5)),
    updatedAt: ts(now),
    signedAt: ts(addDays(activeStartDate, -3)),
    borrowerName: FULL_NAME,
    borrowerPhotoURL,
    borrowerRating: 4.8,
    lenderName,
    lenderPhotoURL,
    lenderRating,
  };

  const completedLoanDoc = {
    loanId: completedLoanId,
    adId: completedAdId,
    requestId: completedRequestId,
    lenderId: LENDER_ID,
    borrowerId: BORROWER_ID,
    principalAmount: completedPrincipal,
    interestRate: completedInterestRate,
    tenureMonths: completedTenureMonths,
    monthlyInstallment: completedMonthlyInstallment,
    outstandingBalance: 0,
    totalInterest: completedTotalRepayable - completedPrincipal,
    status: 'completed',
    startDate: ts(completedStartDate),
    nextDueDate: ts(addMonths(completedStartDate, completedTenureMonths)),
    endDate: ts(addMonths(completedStartDate, completedTenureMonths)),
    repaymentsMade: completedTenureMonths,
    createdAt: ts(addDays(completedStartDate, -2)),
    updatedAt: ts(addDays(now, -20)),
    signedAt: ts(addDays(completedStartDate, 2)),
    borrowerName: FULL_NAME,
    borrowerPhotoURL,
    borrowerRating: 4.8,
    lenderName,
    lenderPhotoURL,
    lenderRating,
  };

  const repaymentDocs = [
    {
      repaymentId: 'nimal_repayment_active_001',
      loanId: activeLoanId,
      borrowerId: BORROWER_ID,
      lenderId: LENDER_ID,
      amount: activeMonthlyInstallment,
      principalPaid: activeMonthlyInstallment - 1800,
      interestPaid: 1800,
      paymentMethod: 'qr_payment',
      transactionReference: `NIMAL-ACT-${new Date(addMonths(activeStartDate, 1)).toISOString().slice(0,10).replace(/-/g,'')}-001`,
      paymentProofUrl: 'https://firebasestorage.googleapis.com/v0/b/smart-credit-plus.appspot.com/o/payments%2Fnimal-active-001.jpg?alt=media',
      status: 'completed',
      dueDate: ts(addMonths(activeStartDate, 1)),
      paidAt: ts(addDays(activeStartDate, 7)),
      installmentNumber: 1,
      createdAt: ts(addDays(activeStartDate, 7)),
    },
    {
      repaymentId: 'nimal_repayment_active_002',
      loanId: activeLoanId,
      borrowerId: BORROWER_ID,
      lenderId: LENDER_ID,
      amount: activeMonthlyInstallment,
      principalPaid: activeMonthlyInstallment - 1700,
      interestPaid: 1700,
      paymentMethod: 'bank_transfer',
      transactionReference: `NIMAL-ACT-${new Date(addMonths(activeStartDate, 2)).toISOString().slice(0,10).replace(/-/g,'')}-002`,
      paymentProofUrl: 'https://firebasestorage.googleapis.com/v0/b/smart-credit-plus.appspot.com/o/payments%2Fnimal-active-002.jpg?alt=media',
      status: 'completed',
      dueDate: ts(addMonths(activeStartDate, 2)),
      paidAt: ts(addDays(activeStartDate, 36)),
      installmentNumber: 2,
      createdAt: ts(addDays(activeStartDate, 36)),
    },
    {
      repaymentId: 'nimal_repayment_completed_001',
      loanId: completedLoanId,
      borrowerId: BORROWER_ID,
      lenderId: LENDER_ID,
      amount: completedMonthlyInstallment,
      principalPaid: completedMonthlyInstallment - 1200,
      interestPaid: 1200,
      paymentMethod: 'card',
      transactionReference: `NIMAL-COMP-${new Date(addMonths(completedStartDate, 1)).toISOString().slice(0,10).replace(/-/g,'')}-001`,
      paymentProofUrl: 'https://firebasestorage.googleapis.com/v0/b/smart-credit-plus.appspot.com/o/payments%2Fnimal-completed-001.jpg?alt=media',
      status: 'completed',
      dueDate: ts(addMonths(completedStartDate, 1)),
      paidAt: ts(addDays(completedStartDate, 2)),
      installmentNumber: 1,
      createdAt: ts(addDays(completedStartDate, 2)),
    },
    {
      repaymentId: 'nimal_repayment_completed_002',
      loanId: completedLoanId,
      borrowerId: BORROWER_ID,
      lenderId: LENDER_ID,
      amount: completedMonthlyInstallment,
      principalPaid: completedMonthlyInstallment - 1100,
      interestPaid: 1100,
      paymentMethod: 'qr_payment',
      transactionReference: `NIMAL-COMP-${new Date(addMonths(completedStartDate, 2)).toISOString().slice(0,10).replace(/-/g,'')}-002`,
      paymentProofUrl: 'https://firebasestorage.googleapis.com/v0/b/smart-credit-plus.appspot.com/o/payments%2Fnimal-completed-002.jpg?alt=media',
      status: 'completed',
      dueDate: ts(addMonths(completedStartDate, 2)),
      paidAt: ts(addDays(completedStartDate, 33)),
      installmentNumber: 2,
      createdAt: ts(addDays(completedStartDate, 33)),
    },
    {
      repaymentId: 'nimal_repayment_completed_003',
      loanId: completedLoanId,
      borrowerId: BORROWER_ID,
      lenderId: LENDER_ID,
      amount: completedMonthlyInstallment,
      principalPaid: completedMonthlyInstallment - 1000,
      interestPaid: 1000,
      paymentMethod: 'bank_transfer',
      transactionReference: `NIMAL-COMP-${new Date(addMonths(completedStartDate, 3)).toISOString().slice(0,10).replace(/-/g,'')}-003`,
      paymentProofUrl: 'https://firebasestorage.googleapis.com/v0/b/smart-credit-plus.appspot.com/o/payments%2Fnimal-completed-003.jpg?alt=media',
      status: 'completed',
      dueDate: ts(addMonths(completedStartDate, 3)),
      paidAt: ts(addDays(completedStartDate, 63)),
      installmentNumber: 3,
      createdAt: ts(addDays(completedStartDate, 63)),
    },
  ];

  const lenderBorrowerDoc = {
    relationId: `${LENDER_ID}__${BORROWER_ID}`,
    lenderId: LENDER_ID,
    borrowerId: BORROWER_ID,
    lenderName,
    lenderPhotoURL,
    lenderRating,
    borrowerName: FULL_NAME,
    borrowerPhotoURL,
    borrowerRating: 4.8,
    borrowerCreditScore: 742,
    loanIds: [activeLoanId, completedLoanId],
    loanRequestIds: [activeRequestId, completedRequestId],
    activeLoanCount: 1,
    completedLoanCount: 1,
    totalLoans: 2,
    totalPrincipalAmount: activePrincipal + completedPrincipal,
    latestLoanStatus: 'active',
    firstLoanCreatedAt: ts(addDays(completedStartDate, -2)),
    latestLoanCreatedAt: ts(activeStartDate),
    createdAt: ts(now),
    updatedAt: ts(now),
  };

  const writes = [
    { ref: db.collection('users').doc(BORROWER_ID), data: borrowerUserDoc },
    { ref: db.collection('borrowers').doc(BORROWER_ID), data: borrowerProfileDoc },
    {
      ref: db.collection('ads').doc(pendingAdId),
      data: sharedAdData(
        pendingAdId,
        90000,
        15.5,
        6,
        addDays(now, -5),
        'medical',
        'Fast medical support loans',
        'Short-term medical loans for verified Colombo borrowers.',
        1,
        0,
      ),
    },
    {
      ref: db.collection('ads').doc(activeAdId),
      data: sharedAdData(
        activeAdId,
        activePrincipal,
        activeInterestRate,
        activeTenureMonths,
        addDays(now, -80),
        'personal',
        'Flexible personal loan offer',
        'Personal loans with bank transfer repayment and fast lender response.',
        1,
        1,
      ),
    },
    {
      ref: db.collection('ads').doc(completedAdId),
      data: sharedAdData(
        completedAdId,
        completedPrincipal,
        completedInterestRate,
        completedTenureMonths,
        addDays(now, -175),
        'education',
        'Education funding support',
        'Small education loans for verified salaried borrowers.',
        1,
        1,
      ),
    },
    { ref: db.collection('loanRequests').doc(pendingRequestId), data: pendingRequestDoc },
    { ref: db.collection('loanRequests').doc(activeRequestId), data: activeRequestDoc },
    { ref: db.collection('loanRequests').doc(completedRequestId), data: completedRequestDoc },
    { ref: db.collection('loans').doc(activeLoanId), data: activeLoanDoc },
    { ref: db.collection('loans').doc(completedLoanId), data: completedLoanDoc },
    { ref: db.collection('lenderBorrowers').doc(lenderBorrowerDoc.relationId), data: lenderBorrowerDoc },
  ];

  repaymentDocs.forEach((doc) => {
    writes.push({ ref: db.collection('repayments').doc(doc.repaymentId), data: doc });
  });

  const existingRepayments = await db
    .collection('repayments')
    .where('borrowerId', '==', BORROWER_ID)
    .get();

  for (const doc of existingRepayments.docs) {
    await doc.ref.delete();
  }

  for (const write of writes) {
    await write.ref.set(write.data, { merge: true });
  }

  console.log(`Seeded borrower login: ${EMAIL} / ${PASSWORD}`);
  console.log(
    `Seeded borrower profile and ${repaymentDocs.length} repayments for display data.`,
  );
  console.log(`Removed ${existingRepayments.size} stale Nimal repayment records first.`);
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const keyPath = options.key;

  if (!fs.existsSync(keyPath)) {
    throw new Error(`Service account file not found: ${keyPath}`);
  }

  if (!options.skipBase) {
    const baseSeedResult = spawnSync(
      process.execPath,
      [BASE_SEED_SCRIPT, `--key=${keyPath}`],
      {
        cwd: __dirname,
        stdio: 'inherit',
      },
    );

    if (baseSeedResult.status !== 0) {
      throw new Error(
        `Base seed failed with exit code ${baseSeedResult.status ?? 'unknown'}`,
      );
    }
  } else {
    console.log('Skipping base mock seed; writing only Nimal borrower data.');
  }

  if (admin.apps.length === 0) {
    const serviceAccount = require(keyPath);
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
    });
  }

  const db = admin.firestore();
  await writeSpecialBorrowerData(db, new Date());

  console.log('Seed master complete.');
}

main().catch((error) => {
  console.error('Seed master failed:', error);
  process.exitCode = 1;
});
