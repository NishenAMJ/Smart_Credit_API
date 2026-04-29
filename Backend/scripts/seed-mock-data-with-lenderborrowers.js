/**
 * WARNING: DELETE ALL EXISTING DATA BEFORE RUNNING
 * This script creates a full Smart Credit+ Firestore mock dataset.
 * Run with: node seed-mock-data.js
 * Optional: node seed-mock-data.js --key=./your-service-account-key.json
 * Optional backfill for old data: node seed-mock-data.js --backfill-missing
 * Deep nested backfill (more reads): node seed-mock-data.js --backfill-missing --deep-backfill
 * Backfill only mode: node seed-mock-data.js --backfill-only
 */

'use strict';

const fs = require('fs');
const path = require('path');
const admin = require('firebase-admin');

const USERS_COLLECTION = 'users';
const ADS_COLLECTION = 'ads';
const REQUESTS_COLLECTION = 'loanRequests';
const LOANS_COLLECTION = 'loans';
const LENDER_BORROWERS_COLLECTION = 'lenderBorrowers';
const TRANSACTIONS_COLLECTION = 'transactions';
const DISPUTES_COLLECTION = 'disputes';
const DEFAULT_KEY_PATH = './your-service-account-key.json';
const MAX_BATCH_SIZE = 400;

const PURPOSES = ['education', 'business', 'medical', 'personal', 'vehicle', 'home'];
const LOCATIONS = [
  'Colombo', 'Kandy', 'Galle', 'Negombo', 'Kurunegala', 'Jaffna',
  'Matara', 'Kalutara', 'Anuradhapura', 'Ratnapura', 'Batticaloa', 'Badulla'
];
const PAYMENT_TYPES = ['qr', 'receipt', 'manual'];
const REQUEST_STATUSES = ['open', 'matched', 'under_review', 'pending_kyc', 'approved', 'accepted'];
const REQUEST_URGENCIES = ['low', 'medium', 'high', 'critical'];
const INCOME_SOURCES = ['salary', 'business', 'freelance', 'rental', 'farming'];
const PURPOSE_CATEGORY_MAP = {
  education: 'education',
  business: 'business',
  medical: 'emergency',
  personal: 'personal',
  vehicle: 'asset_purchase',
  home: 'housing'
};
const REQUEST_NOTES = [
  'Borrower attached repayment plan and last three months of statements.',
  'Borrower asked for a fast decision because the opportunity window is short.',
  'Initial affordability check looks acceptable, but more documents are still needed.',
  'Borrower prefers a clear monthly installment schedule before accepting terms.',
  'Requested quick turnaround after discussing terms with the lender support team.',
  'Application includes income proof, ID copy, and a short use-of-funds note.'
];
const FIRST_NAMES = [
  'Nimal', 'Kamal', 'Kasun', 'Tharindu', 'Sanduni', 'Nadeesha', 'Dilini', 'Ruwan',
  'Chathura', 'Ishara', 'Dinuka', 'Amasha', 'Shanaka', 'Vihanga', 'Nethmi', 'Akila',
  'Yasiru', 'Sajini', 'Madhavi', 'Supun', 'Fathima', 'Ahamed', 'Imesha', 'Shehan',
  'Charith', 'Madushi', 'Kaveesha', 'Sasindu', 'Pasindu', 'Thilini', 'Rashmi', 'Anudi'
];
const LAST_NAMES = [
  'Perera', 'Fernando', 'Silva', 'Bandara', 'Jayasinghe', 'Rathnayake', 'Herath',
  'Karunaratne', 'Seneviratne', 'De Silva', 'Wijesinghe', 'Gunasekara', 'Rajapaksa',
  'Madushanka', 'Lakmal', 'Nawaratne', 'Samarakoon', 'Udayanga'
];

/**
 * @typedef {Object} UserDoc
 * @property {string} uid
 * @property {string[]} role
 * @property {string} fullName
 * @property {string} photoURL
 * @property {string} phone
 * @property {string} email
 * @property {number} creditScore
 * @property {number} rating
 * @property {number} totalLoansCompleted
 * @property {number} totalAmountLent
 * @property {number} totalAmountBorrowed
 * @property {"approved"} kycStatus
 * @property {FirebaseFirestore.Timestamp} createdAt
 * @property {FirebaseFirestore.Timestamp} updatedAt
 */

/**
 * @typedef {Object} AdDoc
 * @property {string} adId
 * @property {string} lenderId
 * @property {string} title
 * @property {string} description
 * @property {number} minAmount
 * @property {number} maxAmount
 * @property {number} preferredInterestRate
 * @property {number} minTenureMonths
 * @property {number} maxTenureMonths
 * @property {string[]} preferredPurposes
 * @property {string} location
 * @property {"active"} status
 * @property {FirebaseFirestore.Timestamp} createdAt
 * @property {FirebaseFirestore.Timestamp} updatedAt
 * @property {FirebaseFirestore.Timestamp} expiresAt
 * @property {boolean} isBoosted
 * @property {number} availableCapital
 * @property {number} applicationCount
 * @property {number} fundedLoansCount
 * @property {number} responseTimeHours
 * @property {string} lenderName
 * @property {string} lenderPhotoURL
 * @property {number} lenderRating
 * @property {string[]} searchKeywords
 * @property {string} seedBatchId
 * @property {string} source
 */

/**
 * @typedef {Object} LoanRequestDoc
 * @property {string} requestId
 * @property {string | null} adId
 * @property {string} borrowerId
 * @property {number} amount
 * @property {number} tenureMonths
 * @property {string} purpose
 * @property {string} purposeCategory
 * @property {string} status
 * @property {FirebaseFirestore.Timestamp} createdAt
 * @property {FirebaseFirestore.Timestamp} updatedAt
 * @property {string} borrowerName
 * @property {string} borrowerPhotoURL
 * @property {number} borrowerRating
 * @property {number} borrowerCreditScore
 * @property {string | null} targetLenderId
 * @property {string[]} matchedLenderIds
 * @property {number} suggestedInterestRate
 * @property {string} urgency
 * @property {number} monthlyIncome
 * @property {string} incomeSource
 * @property {string} requestedRegion
 * @property {boolean} collateralOffered
 * @property {string} notes
 */

/**
 * @typedef {Object} LoanDoc
 * @property {string} loanId
 * @property {string} adId
 * @property {string} requestId
 * @property {string} lenderId
 * @property {string} borrowerId
 * @property {number} principalAmount
 * @property {number} interestRate
 * @property {number} tenureMonths
 * @property {FirebaseFirestore.Timestamp} startDate
 * @property {FirebaseFirestore.Timestamp} endDate
 * @property {FirebaseFirestore.Timestamp} nextDueDate
 * @property {"active"|"completed"} status
 * @property {number} totalRepayable
 * @property {FirebaseFirestore.Timestamp} createdAt
 * @property {FirebaseFirestore.Timestamp} signedAt
 * @property {string} borrowerName
 * @property {string} borrowerPhotoURL
 * @property {number} borrowerRating
 */

function parseArgs(argv) {
  const options = {
    key: DEFAULT_KEY_PATH,
    backfillMissing: false,
    deepBackfill: false,
    backfillOnly: false
  };
  argv.forEach((arg) => {
    if (arg.startsWith('--key=')) {
      options.key = arg.slice('--key='.length);
    } else if (arg === '--backfill-missing') {
      options.backfillMissing = true;
    } else if (arg === '--deep-backfill') {
      options.deepBackfill = true;
    } else if (arg === '--backfill-only') {
      options.backfillOnly = true;
    }
  });
  return options;
}

function mulberry32(seed) {
  let t = seed >>> 0;
  return function random() {
    t += 0x6D2B79F5;
    let value = Math.imul(t ^ (t >>> 15), t | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

function randomInt(rng, min, max) {
  return Math.floor(rng() * (max - min + 1)) + min;
}

function randomFloat(rng, min, max, decimals) {
  return Number((rng() * (max - min) + min).toFixed(decimals));
}

function pick(rng, values) {
  return values[randomInt(rng, 0, values.length - 1)];
}

function shuffle(rng, values) {
  const arr = values.slice();
  for (let i = arr.length - 1; i > 0; i -= 1) {
    const j = randomInt(rng, 0, i);
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function maybe(rng, probability) {
  return rng() < probability;
}

function pad(value, length) {
  return String(value).padStart(length, '0');
}

function addDays(date, days) {
  const copy = new Date(date.getTime());
  copy.setUTCDate(copy.getUTCDate() + days);
  return copy;
}

function addHours(date, hours) {
  const copy = new Date(date.getTime());
  copy.setUTCHours(copy.getUTCHours() + hours);
  return copy;
}

function addMonths(date, months) {
  const copy = new Date(date.getTime());
  copy.setUTCMonth(copy.getUTCMonth() + months);
  return copy;
}

function clampDate(date) {
  return new Date(date.getTime());
}

function ts(date) {
  return admin.firestore.Timestamp.fromDate(clampDate(date));
}

function photoURL(id) {
  return `https://i.pravatar.cc/300?u=${encodeURIComponent(id)}`;
}

function emailFromName(name, suffix) {
  return `${name.toLowerCase().replace(/[^a-z]+/g, '.').replace(/(^\.|\.$)/g, '')}.${suffix}@smartcredit.lk`;
}

function phoneNumber(index) {
  return `+947${pad(10000000 + index * 73, 8)}`;
}

function buildName(index) {
  const first = FIRST_NAMES[index % FIRST_NAMES.length];
  const last = LAST_NAMES[(index * 5) % LAST_NAMES.length];
  return `${first} ${last}`;
}

function pickPurposes(rng) {
  return shuffle(rng, PURPOSES).slice(0, randomInt(rng, 2, 3));
}

function roundCurrency(value) {
  return Math.round(value / 100) * 100;
}

function splitAmount(total, parts, rng) {
  if (parts <= 1) {
    return [total];
  }

  const weights = [];
  let totalWeight = 0;
  for (let i = 0; i < parts; i += 1) {
    const weight = 0.5 + rng();
    weights.push(weight);
    totalWeight += weight;
  }

  const amounts = [];
  let running = 0;
  for (let i = 0; i < parts; i += 1) {
    if (i === parts - 1) {
      amounts.push(total - running);
    } else {
      const amount = Math.max(100, Math.round((total * weights[i]) / totalWeight));
      amounts.push(amount);
      running += amount;
    }
  }

  const current = amounts.reduce((sum, value) => sum + value, 0);
  amounts[amounts.length - 1] += total - current;
  return amounts;
}

function purposeCategoryFromPurpose(purpose) {
  return PURPOSE_CATEGORY_MAP[purpose] || 'uncategorized';
}

function buildSearchKeywords(values) {
  return Array.from(
    new Set(
      values
        .flatMap((value) =>
          String(value || '')
            .toLowerCase()
            .split(/[^a-z0-9]+/)
        )
        .filter((token) => token.length > 1)
    )
  );
}

function buildAdTitle(purpose, location, maxAmount) {
  const normalizedPurpose = purpose.charAt(0).toUpperCase() + purpose.slice(1);
  return `${normalizedPurpose} funding up to LKR ${Math.round(maxAmount).toLocaleString()} in ${location}`;
}

function buildAdDescription(lenderName, purpose, location) {
  return `${lenderName} is offering ${purpose} financing for borrowers in ${location} with transparent lender review and flexible repayment discussion.`;
}

function createAdDocument(input) {
  const title = input.title || buildAdTitle(input.primaryPurpose, input.location, input.maxAmount);
  const description =
    input.description ||
    buildAdDescription(input.lender.fullName, input.primaryPurpose, input.location);
  const minAmount =
    input.minAmount ||
    roundCurrency(Math.max(10000, Math.min(input.maxAmount * 0.35, input.maxAmount - 10000)));
  const updatedAt = input.updatedAt || input.createdAt;

  return {
    adId: input.adId,
    lenderId: input.lender.uid,
    title,
    description,
    minAmount,
    maxAmount: input.maxAmount,
    preferredInterestRate: input.preferredInterestRate,
    minTenureMonths: Math.min(6, input.maxTenureMonths),
    maxTenureMonths: input.maxTenureMonths,
    preferredPurposes: input.preferredPurposes,
    location: input.location,
    status: 'active',
    createdAt: ts(input.createdAt),
    updatedAt: ts(updatedAt),
    expiresAt: ts(input.expiresAt),
    isBoosted: input.isBoosted === true,
    availableCapital: input.availableCapital || input.maxAmount,
    applicationCount: input.applicationCount || 0,
    fundedLoansCount: input.fundedLoansCount || 0,
    responseTimeHours: input.responseTimeHours || 24,
    lenderName: input.lender.fullName,
    lenderPhotoURL: input.lender.photoURL,
    lenderRating: input.lender.rating,
    searchKeywords: buildSearchKeywords([
      input.lender.fullName,
      title,
      location,
      ...input.preferredPurposes
    ]),
    seedBatchId: input.seedBatchId || 'seed_mock_data_20260421',
    source: input.source || 'seed_script'
  };
}

function createRequestDocument(input) {
  const updatedAt = input.updatedAt || input.createdAt;

  return {
    requestId: input.requestId,
    adId: input.adId || null,
    borrowerId: input.borrower.uid,
    amount: input.amount,
    tenureMonths: input.tenureMonths,
    purpose: input.purpose,
    purposeCategory: input.purposeCategory || purposeCategoryFromPurpose(input.purpose),
    status: input.status,
    createdAt: ts(input.createdAt),
    updatedAt: ts(updatedAt),
    borrowerName: input.borrower.fullName,
    borrowerPhotoURL: input.borrower.photoURL,
    borrowerRating: input.borrower.rating,
    borrowerCreditScore: input.borrower.creditScore,
    targetLenderId: input.targetLenderId || null,
    matchedLenderIds: input.matchedLenderIds || [],
    suggestedInterestRate: input.suggestedInterestRate,
    urgency: input.urgency,
    monthlyIncome: input.monthlyIncome,
    incomeSource: input.incomeSource,
    requestedRegion: input.requestedRegion,
    collateralOffered: input.collateralOffered === true,
    notes: input.notes || ''
  };
}

async function commitWrites(db, writes, label) {
  let batch = db.batch();
  let opCount = 0;
  let batchCount = 0;

  for (let i = 0; i < writes.length; i += 1) {
    const write = writes[i];
    batch.set(write.ref, write.data);
    opCount += 1;

    if (opCount === MAX_BATCH_SIZE || i === writes.length - 1) {
      batchCount += 1;
      await batch.commit();
      console.log(`Committed ${label} batch ${batchCount} (${opCount} writes)`);
      batch = db.batch();
      opCount = 0;
    }
  }
}

function createUsers(db, now, rng) {
  /** @type {Map<string, UserDoc>} */
  const lenders = new Map();
  /** @type {Map<string, UserDoc>} */
  const borrowers = new Map();
  const writes = [];

  for (let i = 1; i <= 15; i += 1) {
    const uid = `lender_${pad(i, 3)}`;
    const fullName = buildName(i);
    const createdAt = addDays(now, -randomInt(rng, 120, 660));
    /** @type {UserDoc} */
    const lender = {
      uid,
      role: ['lender'],
      fullName,
      photoURL: photoURL(uid),
      phone: phoneNumber(i),
      email: emailFromName(fullName, `l${pad(i, 2)}`),
      creditScore: randomInt(rng, 690, 840),
      rating: randomFloat(rng, 4.2, 5, 1),
      totalLoansCompleted: 0,
      totalAmountLent: 0,
      totalAmountBorrowed: 0,
      kycStatus: 'approved',
      createdAt: ts(createdAt),
      updatedAt: ts(addDays(createdAt, randomInt(rng, 5, 45)))
    };
    lenders.set(uid, lender);
    writes.push({ ref: db.collection(USERS_COLLECTION).doc(uid), data: lender });
  }

  for (let i = 1; i <= 45; i += 1) {
    const uid = `borrower_${pad(i, 3)}`;
    const fullName = buildName(i + 100);
    const createdAt = addDays(now, -randomInt(rng, 90, 540));
    /** @type {UserDoc} */
    const borrower = {
      uid,
      role: ['borrower'],
      fullName,
      photoURL: photoURL(uid),
      phone: phoneNumber(i + 50),
      email: emailFromName(fullName, `b${pad(i, 2)}`),
      creditScore: randomInt(rng, 480, 790),
      rating: randomFloat(rng, 3.8, 5, 1),
      totalLoansCompleted: 0,
      totalAmountLent: 0,
      totalAmountBorrowed: 0,
      kycStatus: 'approved',
      createdAt: ts(createdAt),
      updatedAt: ts(addDays(createdAt, randomInt(rng, 5, 35)))
    };
    borrowers.set(uid, borrower);
    writes.push({ ref: db.collection(USERS_COLLECTION).doc(uid), data: borrower });
  }

  return { lenders, borrowers, writes };
}

function createLoanDistribution() {
  // The stated totals are mathematically inconsistent if all 45 loans must fit
  // strictly inside the 3-4 / 1-2 lender caps. This distribution satisfies:
  // - 8 lenders with 4 active loans each
  // - 4 lenders with 2 active loans each
  // - 3 lenders with 0 loans
  // - 5 extra completed loans assigned to some active lenders
  const activeCounts = [4, 4, 4, 4, 4, 4, 4, 4, 2, 2, 2, 2, 0, 0, 0];
  const completedExtras = [1, 1, 1, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
  return activeCounts.map((activeCount, index) => ({
    lenderIndex: index,
    activeCount,
    completedExtra: completedExtras[index],
    totalLoans: activeCount + completedExtras[index]
  }));
}

function createAdsAndLoans(db, now, rng, lenders, borrowers) {
  const lenderList = Array.from(lenders.values());
  const borrowerList = Array.from(borrowers.values());
  const distribution = createLoanDistribution();

  const adWrites = [];
  const requestWrites = [];
  const loanWrites = [];
  const installmentWrites = [];
  const paymentWrites = [];
  const lenderBorrowerMap = new Map();
  /** @type {Map<string, { lenderId: string, borrowerId: string }>} */
  const loanMeta = new Map();
  /** @type {Map<string, Array<{ id: string, lenderId: string, title: string, location: string, preferredInterestRate: number, maxAmount: number, maxTenureMonths: number, preferredPurposes: string[], createdAt: Date }>>} */
  const adsByLender = new Map();

  let adsCount = 0;
  let requestsCount = 0;
  let loansCount = 0;
  let installmentsCount = 0;
  let paymentsCount = 0;

  const borrowerAssignments = borrowerList.slice();
  let borrowerPointer = 0;

  function rememberAd(lenderId, adMeta) {
    if (!adsByLender.has(lenderId)) {
      adsByLender.set(lenderId, []);
    }

    adsByLender.get(lenderId).push(adMeta);
  }

  distribution.forEach((entry, distributionIndex) => {
    const lender = lenderList[entry.lenderIndex];

    for (let loanOffset = 0; loanOffset < entry.totalLoans; loanOffset += 1) {
      const borrower = borrowerAssignments[borrowerPointer];
      borrowerPointer += 1;

      const adRef = db.collection(ADS_COLLECTION).doc();
      const requestRef = db.collection(REQUESTS_COLLECTION).doc();
      const loanRef = db.collection(LOANS_COLLECTION).doc();

      const principalAmount = roundCurrency(randomInt(rng, 20000, 500000));
      const interestRate = randomFloat(rng, 8, 24, 1);
      const tenureMonths = pick(rng, [6, 9, 12, 15, 18, 24, 30, 36]);
      const totalRepayable = roundCurrency(principalAmount + (principalAmount * interestRate * tenureMonths) / 1200);
      const purpose = pick(rng, PURPOSES);
      const location = pick(rng, LOCATIONS);
      const preferredPurposes = pickPurposes(rng);
      const isRecentLoanScenario = maybe(rng, 0.28);
      const adCreatedAt = isRecentLoanScenario
        ? addDays(now, -randomInt(rng, 8, 28))
        : addDays(now, -randomInt(rng, 100, 540));
      const requestCreatedAt = addDays(
        adCreatedAt,
        randomInt(rng, 1, isRecentLoanScenario ? 5 : 20)
      );
      const createdAt = addDays(
        requestCreatedAt,
        randomInt(rng, 0, isRecentLoanScenario ? 2 : 12)
      );
      const signedAt = addDays(
        createdAt,
        randomInt(rng, 0, isRecentLoanScenario ? 2 : 5)
      );
      const startDate = addDays(
        signedAt,
        randomInt(rng, 0, isRecentLoanScenario ? 2 : 7)
      );
      const isCompleted = loanOffset < entry.completedExtra;
      const loanStatus = isCompleted ? 'completed' : 'active';
      const firstInstallmentDate = addMonths(startDate, 1);
      const installmentAmount = Math.round(totalRepayable / tenureMonths);
      const hasInstallmentCycleStarted = firstInstallmentDate.getTime() <= now.getTime();

      const paidInstallmentsBase = isCompleted
        ? tenureMonths
        : hasInstallmentCycleStarted
          ? Math.min(tenureMonths - 1, randomInt(rng, 1, Math.max(2, tenureMonths - 2)))
          : 0;
      const partialInstallmentNumber = !isCompleted && hasInstallmentCycleStarted && maybe(rng, 0.5)
        ? Math.min(tenureMonths, paidInstallmentsBase + 1)
        : null;

      const nextDueDateDate = isCompleted
        ? addMonths(firstInstallmentDate, tenureMonths - 1)
        : addMonths(firstInstallmentDate, paidInstallmentsBase);

      /** @type {AdDoc} */
      const adMaxAmount = Math.max(
        principalAmount,
        roundCurrency(principalAmount + randomInt(rng, 30000, 180000))
      );
      const adDoc = createAdDocument({
        adId: adRef.id,
        lender,
        minAmount: roundCurrency(Math.max(10000, principalAmount * 0.45)),
        maxAmount: adMaxAmount,
        preferredInterestRate: interestRate,
        maxTenureMonths: tenureMonths,
        preferredPurposes,
        primaryPurpose: purpose,
        location,
        createdAt: adCreatedAt,
        updatedAt: requestCreatedAt,
        expiresAt: addDays(adCreatedAt, 180),
        isBoosted: maybe(rng, 0.2),
        availableCapital: adMaxAmount,
        applicationCount: 1,
        fundedLoansCount: 1,
        responseTimeHours: randomInt(rng, 4, 24),
        source: 'seed_base_loan_flow'
      });

      /** @type {LoanRequestDoc} */
      const requestDoc = createRequestDocument({
        requestId: requestRef.id,
        adId: adRef.id,
        borrower,
        amount: principalAmount,
        tenureMonths,
        purpose,
        status: 'accepted',
        createdAt: requestCreatedAt,
        updatedAt: signedAt,
        targetLenderId: lender.uid,
        matchedLenderIds: [],
        suggestedInterestRate: interestRate,
        urgency: pick(rng, ['medium', 'high']),
        monthlyIncome: roundCurrency(randomInt(rng, 45000, 280000)),
        incomeSource: pick(rng, INCOME_SOURCES),
        requestedRegion: location,
        collateralOffered: maybe(rng, 0.35),
        notes: pick(rng, REQUEST_NOTES)
      });

      /** @type {LoanDoc} */
      const loanDoc = {
        loanId: loanRef.id,
        adId: adRef.id,
        requestId: requestRef.id,
        lenderId: lender.uid,
        borrowerId: borrower.uid,
        principalAmount,
        interestRate,
        tenureMonths,
        startDate: ts(startDate),
        endDate: ts(addMonths(startDate, tenureMonths)),
        nextDueDate: ts(nextDueDateDate),
        status: loanStatus,
        totalRepayable,
        createdAt: ts(createdAt),
        signedAt: ts(signedAt),
        borrowerName: borrower.fullName,
        borrowerPhotoURL: borrower.photoURL,
        borrowerRating: borrower.rating
      };

      adWrites.push({ ref: adRef, data: adDoc });
      requestWrites.push({ ref: requestRef, data: requestDoc });
      loanWrites.push({ ref: loanRef, data: loanDoc });
      rememberAd(lender.uid, {
        id: adRef.id,
        lenderId: lender.uid,
        title: adDoc.title,
        location: adDoc.location,
        preferredInterestRate: adDoc.preferredInterestRate,
        maxAmount: adDoc.maxAmount,
        maxTenureMonths: adDoc.maxTenureMonths,
        preferredPurposes: adDoc.preferredPurposes,
        createdAt: adCreatedAt
      });
      loanMeta.set(loanRef.id, {
        lenderId: lender.uid,
        borrowerId: borrower.uid
      });

      const relationId = `${lender.uid}__${borrower.uid}`;
      if (!lenderBorrowerMap.has(relationId)) {
        lenderBorrowerMap.set(relationId, {
          relationId,
          lenderId: lender.uid,
          borrowerId: borrower.uid,
          lenderName: lender.fullName,
          lenderPhotoURL: lender.photoURL,
          lenderRating: lender.rating,
          borrowerName: borrower.fullName,
          borrowerPhotoURL: borrower.photoURL,
          borrowerRating: borrower.rating,
          borrowerCreditScore: borrower.creditScore,
          loanIds: [],
          loanRequestIds: [],
          activeLoanCount: 0,
          completedLoanCount: 0,
          totalLoans: 0,
          totalPrincipalAmount: 0,
          latestLoanStatus: loanStatus,
          firstLoanCreatedAt: ts(createdAt),
          latestLoanCreatedAt: ts(createdAt),
          createdAt: ts(now),
          updatedAt: ts(now)
        });
      }

      const relation = lenderBorrowerMap.get(relationId);
      relation.loanIds.push(loanRef.id);
      relation.loanRequestIds.push(requestRef.id);
      relation.totalLoans += 1;
      relation.totalPrincipalAmount += principalAmount;
      relation.latestLoanStatus = loanStatus;
      relation.latestLoanCreatedAt = ts(createdAt);
      if (loanStatus === 'completed') {
        relation.completedLoanCount += 1;
      } else {
        relation.activeLoanCount += 1;
      }

      adsCount += 1;
      requestsCount += 1;
      loansCount += 1;

      lender.totalAmountLent += principalAmount;
      borrower.totalAmountBorrowed += principalAmount;
      if (isCompleted) {
        lender.totalLoansCompleted += 1;
        borrower.totalLoansCompleted += 1;
      }

      for (let installmentNumber = 1; installmentNumber <= tenureMonths; installmentNumber += 1) {
        const installmentRef = loanRef.collection('installments').doc();
        const dueDate = addMonths(startDate, installmentNumber);
        const installmentId = installmentRef.id;
        let status = 'pending';
        let paidAmount = 0;
        let lastPaidAt = null;
        let paymentsForInstallment = [];

        if (isCompleted || installmentNumber <= paidInstallmentsBase) {
          status = 'paid';
          paidAmount = installmentAmount;
          const paymentCount = randomInt(rng, 1, 3);
          const paymentAmounts = splitAmount(installmentAmount, paymentCount, rng);
          let paymentDateCursor = addDays(dueDate, -randomInt(rng, 2, 10));

          paymentsForInstallment = paymentAmounts.map((amount, paymentIndex) => {
            paymentDateCursor = addDays(paymentDateCursor, paymentIndex === 0 ? 0 : randomInt(rng, 0, 4));
            const paymentRef = installmentRef.collection('payments').doc();
            const paymentType = pick(rng, PAYMENT_TYPES);
            return {
              ref: paymentRef,
              data: {
                paymentId: paymentRef.id,
                loanId: loanRef.id,
                installmentId,
                lenderId: lender.uid,
                borrowerId: borrower.uid,
                amount,
                paidAt: ts(paymentDateCursor),
                paymentType,
                verifiedByLender: true,
                verifiedAt: ts(addDays(paymentDateCursor, randomInt(rng, 0, 2))),
                receiptURL: paymentType === 'receipt' ? `https://example.com/receipts/${paymentRef.id}.jpg` : '',
                qrScanData: paymentType === 'qr' ? JSON.stringify({ txRef: `QR-${paymentRef.id}`, lenderId: lender.uid }) : ''
              }
            };
          });
          lastPaidAt = paymentsForInstallment[paymentCount - 1].data.paidAt;
        } else if (partialInstallmentNumber && installmentNumber === partialInstallmentNumber) {
          status = 'partial';
          paidAmount = roundCurrency(Math.max(1000, installmentAmount * (0.25 + rng() * 0.45)));
          const paymentCount = randomInt(rng, 1, 2);
          const paymentAmounts = splitAmount(paidAmount, paymentCount, rng);
          let paymentDateCursor = addDays(dueDate, randomInt(rng, -2, 18));

          paymentsForInstallment = paymentAmounts.map((amount, paymentIndex) => {
            paymentDateCursor = addDays(paymentDateCursor, paymentIndex === 0 ? 0 : randomInt(rng, 0, 6));
            const paymentRef = installmentRef.collection('payments').doc();
            const paymentType = pick(rng, PAYMENT_TYPES);
            return {
              ref: paymentRef,
              data: {
                paymentId: paymentRef.id,
                loanId: loanRef.id,
                installmentId,
                lenderId: lender.uid,
                borrowerId: borrower.uid,
                amount,
                paidAt: ts(paymentDateCursor),
                paymentType,
                verifiedByLender: true,
                verifiedAt: ts(addDays(paymentDateCursor, randomInt(rng, 0, 3))),
                receiptURL: paymentType === 'receipt' ? `https://example.com/receipts/${paymentRef.id}.jpg` : '',
                qrScanData: paymentType === 'qr' ? JSON.stringify({ txRef: `QR-${paymentRef.id}`, borrowerId: borrower.uid }) : ''
              }
            };
          });
          lastPaidAt = paymentsForInstallment[paymentCount - 1].data.paidAt;
        }

        installmentWrites.push({
          ref: installmentRef,
          data: {
            installmentId,
            loanId: loanRef.id,
            lenderId: lender.uid,
            borrowerId: borrower.uid,
            installmentNumber,
            dueDate: ts(dueDate),
            amountDue: installmentAmount,
            status,
            paidAmount,
            lastPaidAt
          }
        });
        installmentsCount += 1;

        paymentsForInstallment.forEach((paymentWrite) => {
          paymentWrites.push(paymentWrite);
          paymentsCount += 1;
        });
      }

      console.log(
        `Created loan #${loansCount} for borrower ${borrower.uid} with lender ${lender.uid} (${loanStatus})`
      );
    }

    if (entry.totalLoans === 0) {
      const idleAdRef = db.collection(ADS_COLLECTION).doc();
      const idleCreatedAt = addDays(now, -randomInt(rng, 60, 240));
      const idlePurpose = pick(rng, PURPOSES);
      const idleLocation = pick(rng, LOCATIONS);
      const idleMaxAmount = roundCurrency(randomInt(rng, 80000, 450000));
      const idleTenure = pick(rng, [12, 18, 24, 36]);
      const idlePurposes = pickPurposes(rng);
      const idleAdDoc = createAdDocument({
        adId: idleAdRef.id,
        lender,
        maxAmount: idleMaxAmount,
        preferredInterestRate: randomFloat(rng, 9, 18, 1),
        maxTenureMonths: idleTenure,
        preferredPurposes: idlePurposes,
        primaryPurpose: idlePurpose,
        location: idleLocation,
        createdAt: idleCreatedAt,
        updatedAt: idleCreatedAt,
        expiresAt: addDays(idleCreatedAt, 180),
        availableCapital: idleMaxAmount,
        applicationCount: 0,
        fundedLoansCount: 0,
        responseTimeHours: randomInt(rng, 6, 24),
        source: 'seed_idle_active_ad'
      });
      adWrites.push({
        ref: idleAdRef,
        data: idleAdDoc
      });
      rememberAd(lender.uid, {
        id: idleAdRef.id,
        lenderId: lender.uid,
        title: idleAdDoc.title,
        location: idleAdDoc.location,
        preferredInterestRate: idleAdDoc.preferredInterestRate,
        maxAmount: idleAdDoc.maxAmount,
        maxTenureMonths: idleAdDoc.maxTenureMonths,
        preferredPurposes: idleAdDoc.preferredPurposes,
        createdAt: idleCreatedAt
      });
      adsCount += 1;
      console.log(`Created ad-only lender profile for ${lender.uid}`);
    }

    console.log(
      `Prepared lender group ${distributionIndex + 1}/15 with ${entry.totalLoans} loans`
    );
  });

  const recentScenarios = createRecentRequestScenarios(
    db,
    now,
    rng,
    lenders,
    borrowers,
    adsByLender
  );

  adWrites.push(...recentScenarios.adWrites);
  requestWrites.push(...recentScenarios.requestWrites);
  adsCount += recentScenarios.counts.ads;
  requestsCount += recentScenarios.counts.loanRequests;

  return {
    adWrites,
    requestWrites,
    loanWrites,
    installmentWrites,
    paymentWrites,
    lenderBorrowerWrites: Array.from(lenderBorrowerMap.values()).map((relation) => ({
      ref: db.collection(LENDER_BORROWERS_COLLECTION).doc(relation.relationId),
      data: relation
    })),
    loanMeta,
    adsByLender,
    counts: {
      ads: adsCount,
      loanRequests: requestsCount,
      loans: loansCount,
      installments: installmentsCount,
      payments: paymentsCount
    }
  };
}

function createRecentRequestScenarios(db, now, rng, lenders, borrowers, adsByLender) {
  const lenderById = new Map(Array.from(lenders.values()).map((lender) => [lender.uid, lender]));
  const borrowerPool = shuffle(rng, Array.from(borrowers.values()));
  const adWrites = [];
  const requestWrites = [];
  let adsCount = 0;
  let requestsCount = 0;
  let borrowerPointer = 0;

  function nextBorrower() {
    const borrower = borrowerPool[borrowerPointer % borrowerPool.length];
    borrowerPointer += 1;
    return borrower;
  }

  function rememberAdMeta(lenderId, adMeta) {
    if (!adsByLender.has(lenderId)) {
      adsByLender.set(lenderId, []);
    }

    adsByLender.get(lenderId).push(adMeta);
  }

  function ensureScenarioAd(lender, options) {
    const existingAds = adsByLender.get(lender.uid) || [];

    if (options.useExisting !== false && existingAds.length > 0) {
      const preferredIndex = Math.min(options.adIndex || 0, existingAds.length - 1);
      return existingAds[preferredIndex];
    }

    const adRef = db.collection(ADS_COLLECTION).doc();
    const primaryPurpose = options.primaryPurpose || pick(rng, PURPOSES);
    const preferredPurposes = options.preferredPurposes || [primaryPurpose, ...pickPurposes(rng)].slice(0, 3);
    const maxTenureMonths = options.maxTenureMonths || pick(rng, [6, 12, 18, 24, 36]);
    const maxAmount = options.maxAmount || roundCurrency(randomInt(rng, 90000, 650000));
    const createdAt = addDays(now, -randomInt(rng, options.minDaysAgo || 1, options.maxDaysAgo || 6));
    const location = options.location || pick(rng, LOCATIONS);
    const preferredInterestRate =
      typeof options.preferredInterestRate === 'number'
        ? options.preferredInterestRate
        : randomFloat(rng, 9, 20, 1);
    const adDoc = createAdDocument({
      adId: adRef.id,
      lender,
      maxAmount,
      preferredInterestRate,
      maxTenureMonths,
      preferredPurposes,
      primaryPurpose,
      location,
      createdAt,
      updatedAt: createdAt,
      expiresAt: addDays(createdAt, 180),
      availableCapital: maxAmount,
      applicationCount: 0,
      fundedLoansCount: 0,
      responseTimeHours: randomInt(rng, 2, 18),
      source: 'seed_recent_request_scenario'
    });

    adWrites.push({ ref: adRef, data: adDoc });
    adsCount += 1;

    const adMeta = {
      id: adRef.id,
      lenderId: lender.uid,
      title: adDoc.title,
      location: adDoc.location,
      preferredInterestRate: adDoc.preferredInterestRate,
      maxAmount: adDoc.maxAmount,
      maxTenureMonths: adDoc.maxTenureMonths,
      preferredPurposes: adDoc.preferredPurposes,
      createdAt
    };

    rememberAdMeta(lender.uid, adMeta);
    return adMeta;
  }

  function pushScenarioRequest(input) {
    const borrower = input.borrower || nextBorrower();
    const requestRef = db.collection(REQUESTS_COLLECTION).doc();
    const adMeta = input.adMeta || null;
    const purpose =
      input.purpose ||
      pick(
        rng,
        adMeta && Array.isArray(adMeta.preferredPurposes) && adMeta.preferredPurposes.length > 0
          ? adMeta.preferredPurposes
          : PURPOSES
      );
    const tenureMonths =
      input.tenureMonths ||
      (adMeta && adMeta.maxTenureMonths ? adMeta.maxTenureMonths : pick(rng, [6, 9, 12, 18, 24]));
    const maxAmount =
      input.maxAmount ||
      (adMeta && adMeta.maxAmount ? adMeta.maxAmount : roundCurrency(randomInt(rng, 60000, 500000)));
    const minAmount = Math.min(maxAmount - 1000, roundCurrency(Math.max(15000, maxAmount * 0.3)));
    const amount = input.amount || roundCurrency(randomInt(rng, minAmount, maxAmount));
    const createdAt = addDays(now, -input.daysAgo);
    const updatedAt = addHours(
      createdAt,
      Math.min(input.daysAgo * 6, input.updatedHours || randomInt(rng, 3, 18))
    );
    const matchedLenderIds = input.matchedLenderIds || [];
    const requestDoc = createRequestDocument({
      requestId: requestRef.id,
      adId: adMeta ? adMeta.id : null,
      borrower,
      amount,
      tenureMonths,
      purpose,
      status: input.status,
      createdAt,
      updatedAt,
      targetLenderId: input.targetLenderId || null,
      matchedLenderIds,
      suggestedInterestRate:
        typeof input.suggestedInterestRate === 'number'
          ? input.suggestedInterestRate
          : adMeta && adMeta.preferredInterestRate
            ? adMeta.preferredInterestRate
            : randomFloat(rng, 10, 24, 1),
      urgency: input.urgency || pick(rng, REQUEST_URGENCIES),
      monthlyIncome: input.monthlyIncome || roundCurrency(randomInt(rng, 35000, 260000)),
      incomeSource: input.incomeSource || pick(rng, INCOME_SOURCES),
      requestedRegion: input.requestedRegion || (adMeta ? adMeta.location : pick(rng, LOCATIONS)),
      collateralOffered:
        typeof input.collateralOffered === 'boolean'
          ? input.collateralOffered
          : maybe(rng, 0.3),
      notes: input.notes || pick(rng, REQUEST_NOTES)
    });

    requestWrites.push({ ref: requestRef, data: requestDoc });
    requestsCount += 1;
  }

  const lender001 = lenderById.get('lender_001');
  const lender002 = lenderById.get('lender_002');
  const lender003 = lenderById.get('lender_003');
  const lender004 = lenderById.get('lender_004');
  const lender005 = lenderById.get('lender_005');
  const lender006 = lenderById.get('lender_006');
  const lender013 = lenderById.get('lender_013');
  const lender014 = lenderById.get('lender_014');
  const lender015 = lenderById.get('lender_015');

  if (lender001) {
    const mixedPendingAd = ensureScenarioAd(lender001, {
      useExisting: false,
      primaryPurpose: 'business',
      location: 'Colombo',
      maxTenureMonths: 18,
      maxAmount: 550000,
      minDaysAgo: 2,
      maxDaysAgo: 5
    });

    pushScenarioRequest({
      lender: lender001,
      adMeta: mixedPendingAd,
      status: 'open',
      daysAgo: 1,
      urgency: 'critical',
      targetLenderId: lender001.uid,
      notes: 'Urgent working-capital request created yesterday and still waiting for first lender response.'
    });
    pushScenarioRequest({
      lender: lender001,
      adMeta: mixedPendingAd,
      status: 'matched',
      daysAgo: 2,
      urgency: 'high',
      targetLenderId: lender001.uid,
      notes: 'Borrower matched to the ad and is still deciding whether to proceed.'
    });
    pushScenarioRequest({
      lender: lender001,
      adMeta: mixedPendingAd,
      status: 'under_review',
      daysAgo: 3,
      urgency: 'medium',
      targetLenderId: lender001.uid,
      notes: 'Manual review is in progress because income documents need a second look.'
    });
    pushScenarioRequest({
      lender: lender001,
      adMeta: mixedPendingAd,
      status: 'pending_kyc',
      daysAgo: 4,
      urgency: 'medium',
      targetLenderId: lender001.uid,
      notes: 'Borrower still needs to upload the missing KYC document bundle.'
    });
    pushScenarioRequest({
      lender: lender001,
      adMeta: mixedPendingAd,
      status: 'approved',
      daysAgo: 5,
      urgency: 'high',
      targetLenderId: lender001.uid,
      notes: 'Lender approved the request and is waiting for borrower confirmation.'
    });
  }

  if (lender002) {
    const acceptedOnlyAd = ensureScenarioAd(lender002, {
      useExisting: false,
      primaryPurpose: 'medical',
      location: 'Kandy',
      maxTenureMonths: 12,
      maxAmount: 320000,
      minDaysAgo: 1,
      maxDaysAgo: 4
    });

    pushScenarioRequest({
      lender: lender002,
      adMeta: acceptedOnlyAd,
      status: 'accepted',
      daysAgo: 1,
      urgency: 'high',
      targetLenderId: lender002.uid,
      notes: 'Accepted targeted request kept without immediate loan conversion for design testing.'
    });
    pushScenarioRequest({
      lender: lender002,
      adMeta: acceptedOnlyAd,
      status: 'accepted',
      daysAgo: 3,
      urgency: 'medium',
      targetLenderId: lender002.uid,
      notes: 'Second accepted ad request from the last few days with no pending-state history.'
    });
  }

  if (lender003) {
    const existingAd = ensureScenarioAd(lender003, {
      useExisting: true,
      adIndex: 0
    });

    pushScenarioRequest({
      lender: lender003,
      adMeta: existingAd,
      status: 'open',
      daysAgo: 2,
      urgency: 'high',
      targetLenderId: lender003.uid,
      notes: 'Fresh ad-driven request attached to an existing lender ad.'
    });
    pushScenarioRequest({
      lender: lender003,
      adMeta: existingAd,
      status: 'accepted',
      daysAgo: 6,
      urgency: 'medium',
      targetLenderId: lender003.uid,
      notes: 'Accepted request left on the ad without creating a new loan record yet.'
    });
  }

  if (lender004 && lender005) {
    pushScenarioRequest({
      lender: lender004,
      status: 'open',
      daysAgo: 1,
      urgency: 'critical',
      matchedLenderIds: [lender004.uid, lender005.uid],
      requestedRegion: 'Galle',
      purpose: 'vehicle',
      notes: 'Marketplace match shared with two lenders after borrower requested an urgent vehicle loan.'
    });
    pushScenarioRequest({
      lender: lender004,
      status: 'matched',
      daysAgo: 3,
      urgency: 'medium',
      matchedLenderIds: [lender004.uid, lender005.uid],
      requestedRegion: 'Matara',
      purpose: 'personal',
      notes: 'Marketplace request is visible to both lenders through matched lender IDs.'
    });
  }

  if (lender005) {
    pushScenarioRequest({
      lender: lender005,
      status: 'under_review',
      daysAgo: 2,
      urgency: 'high',
      targetLenderId: lender005.uid,
      requestedRegion: 'Negombo',
      purpose: 'home',
      notes: 'Direct lender-targeted request with no ad ID, kept under review.'
    });
    pushScenarioRequest({
      lender: lender005,
      status: 'approved',
      daysAgo: 4,
      urgency: 'medium',
      targetLenderId: lender005.uid,
      requestedRegion: 'Kalutara',
      purpose: 'education',
      notes: 'Directly routed request approved after internal review.'
    });
  }

  if (lender006) {
    ensureScenarioAd(lender006, {
      useExisting: false,
      primaryPurpose: 'personal',
      location: 'Jaffna',
      maxTenureMonths: 24,
      maxAmount: 260000,
      minDaysAgo: 1,
      maxDaysAgo: 2
    });
  }

  if (lender013) {
    const idleAcceptedAd = ensureScenarioAd(lender013, {
      useExisting: true,
      adIndex: 0
    });

    pushScenarioRequest({
      lender: lender013,
      adMeta: idleAcceptedAd,
      status: 'accepted',
      daysAgo: 2,
      urgency: 'medium',
      targetLenderId: lender013.uid,
      notes: 'Ad-only lender with accepted requests only, no pending targeted states.'
    });
    pushScenarioRequest({
      lender: lender013,
      adMeta: idleAcceptedAd,
      status: 'accepted',
      daysAgo: 5,
      urgency: 'high',
      targetLenderId: lender013.uid,
      notes: 'Second accepted-only targeted request for the same idle ad scenario.'
    });
  }

  if (lender014) {
    const idlePendingAd = ensureScenarioAd(lender014, {
      useExisting: true,
      adIndex: 0
    });

    pushScenarioRequest({
      lender: lender014,
      adMeta: idlePendingAd,
      status: 'open',
      daysAgo: 1,
      urgency: 'critical',
      targetLenderId: lender014.uid,
      notes: 'Idle-ad lender now has a same-day open request for urgent UI testing.'
    });
    pushScenarioRequest({
      lender: lender014,
      adMeta: idlePendingAd,
      status: 'pending_kyc',
      daysAgo: 3,
      urgency: 'medium',
      targetLenderId: lender014.uid,
      notes: 'Borrower selected the ad, but lender still waits for KYC completion.'
    });
  }

  if (lender015) {
    const mixedIdleAd = ensureScenarioAd(lender015, {
      useExisting: true,
      adIndex: 0
    });

    pushScenarioRequest({
      lender: lender015,
      adMeta: mixedIdleAd,
      status: 'approved',
      daysAgo: 2,
      urgency: 'high',
      targetLenderId: lender015.uid,
      notes: 'Approved request with no loan conversion yet for the ad-only lender scenario.'
    });
    pushScenarioRequest({
      lender: lender015,
      adMeta: mixedIdleAd,
      status: 'accepted',
      daysAgo: 6,
      urgency: 'medium',
      targetLenderId: lender015.uid,
      notes: 'Accepted request kept alongside a newer approved request on the same active ad.'
    });
  }

  return {
    adWrites,
    requestWrites,
    counts: {
      ads: adsCount,
      loanRequests: requestsCount
    }
  };
}

function updateUserAggregates(db, lenders, borrowers, now) {
  const writes = [];
  lenders.forEach((lender) => {
    lender.updatedAt = ts(now);
    writes.push({ ref: db.collection(USERS_COLLECTION).doc(lender.uid), data: lender });
  });
  borrowers.forEach((borrower) => {
    borrower.updatedAt = ts(now);
    writes.push({ ref: db.collection(USERS_COLLECTION).doc(borrower.uid), data: borrower });
  });
  return writes;
}

async function backfillLenderScope(db, providedLoanMeta, deepBackfill) {
  /** @type {Map<string, { lenderId: string, borrowerId: string }>} */
  const loanMeta = providedLoanMeta || new Map();
  const loanDocs = [];

  if (!providedLoanMeta) {
    const loansSnapshot = await db.collection(LOANS_COLLECTION).get();
    loansSnapshot.docs.forEach((doc) => {
      const data = doc.data();
      const lenderId = typeof data.lenderId === 'string' ? data.lenderId : null;
      const borrowerId = typeof data.borrowerId === 'string' ? data.borrowerId : null;
      if (lenderId) {
        loanMeta.set(doc.id, { lenderId, borrowerId: borrowerId || '' });
      }
      loanDocs.push(doc);
    });
  }

  if (loanMeta.size === 0) {
    console.log('No loan metadata available for backfill.');
    return;
  }

  let batch = db.batch();
  let batchWrites = 0;
  let committedBatches = 0;
  const counts = {
    transactions: 0,
    disputes: 0,
    installments: 0,
    payments: 0
  };

  async function commitBatch() {
    if (batchWrites === 0) {
      return;
    }
    await batch.commit();
    committedBatches += 1;
    batch = db.batch();
    batchWrites = 0;
  }

  async function queueSet(ref, payload) {
    batch.set(ref, payload, { merge: true });
    batchWrites += 1;
    if (batchWrites >= MAX_BATCH_SIZE) {
      await commitBatch();
    }
  }

  const transactionsSnapshot = await db.collection(TRANSACTIONS_COLLECTION).get();
  for (const doc of transactionsSnapshot.docs) {
    const data = doc.data();
    const loanId = typeof data.loanId === 'string' ? data.loanId : null;
    const meta = loanId ? loanMeta.get(loanId) : null;

    if (!meta || !meta.lenderId) {
      continue;
    }

    await queueSet(doc.ref, {
      lenderId: meta.lenderId,
      borrowerId: meta.borrowerId || null
    });
    counts.transactions += 1;
  }

  const disputesSnapshot = await db.collection(DISPUTES_COLLECTION).get();
  for (const doc of disputesSnapshot.docs) {
    const data = doc.data();
    const loanId = typeof data.loanId === 'string' ? data.loanId : null;
    const meta = loanId ? loanMeta.get(loanId) : null;

    if (!meta || !meta.lenderId) {
      continue;
    }

    await queueSet(doc.ref, {
      lenderId: meta.lenderId,
      borrowerId: meta.borrowerId || null
    });
    counts.disputes += 1;
  }

  if (deepBackfill) {
    const targetLoanDocs = loanDocs.length > 0
      ? loanDocs
      : Array.from(loanMeta.keys()).map((loanId) => db.collection(LOANS_COLLECTION).doc(loanId));

    for (const loanRefOrDoc of targetLoanDocs) {
      const loanId = typeof loanRefOrDoc.id === 'string' ? loanRefOrDoc.id : null;
      if (!loanId) {
        continue;
      }

      const meta = loanMeta.get(loanId);
      if (!meta || !meta.lenderId) {
        continue;
      }

      const loanRef = loanRefOrDoc.ref ? loanRefOrDoc.ref : loanRefOrDoc;
      const installmentsSnapshot = await loanRef.collection('installments').get();

      for (const installmentDoc of installmentsSnapshot.docs) {
        await queueSet(installmentDoc.ref, {
          loanId,
          lenderId: meta.lenderId,
          borrowerId: meta.borrowerId || null
        });
        counts.installments += 1;

        const paymentsSnapshot = await installmentDoc.ref.collection('payments').get();
        for (const paymentDoc of paymentsSnapshot.docs) {
          await queueSet(paymentDoc.ref, {
            loanId,
            installmentId: installmentDoc.id,
            lenderId: meta.lenderId,
            borrowerId: meta.borrowerId || null,
            paymentId: paymentDoc.id
          });
          counts.payments += 1;
        }
      }
    }
  }

  await commitBatch();

  console.log('Lender scope backfill complete.');
  console.log(`Committed batches: ${committedBatches}`);
  console.log(JSON.stringify(counts, null, 2));
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const keyPath = path.resolve(process.cwd(), options.key);

  if (!fs.existsSync(keyPath)) {
    throw new Error(`Service account file not found: ${keyPath}`);
  }

  const serviceAccount = require(keyPath);
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });

  const db = admin.firestore();
  const now = new Date();
  const rng = mulberry32(20260421);

  if (options.backfillOnly) {
    console.log('Backfill-only mode started...');
    await backfillLenderScope(db, null, options.deepBackfill);
    return;
  }

  console.log('Starting Smart Credit+ Firestore mock seed...');
  console.log(`Using key file: ${keyPath}`);

  const { lenders, borrowers, writes: userWrites } = createUsers(db, now, rng);
  console.log('Created 15 lenders and 45 borrowers in memory');

  const generated = createAdsAndLoans(db, now, rng, lenders, borrowers);
  const aggregateWrites = updateUserAggregates(db, lenders, borrowers, now);

  console.log('Writing users...');
  await commitWrites(db, userWrites, 'users');

  console.log('Writing ads...');
  await commitWrites(db, generated.adWrites, 'ads');

  console.log('Writing loan requests...');
  await commitWrites(db, generated.requestWrites, 'loanRequests');

  console.log('Writing loans...');
  await commitWrites(db, generated.loanWrites, 'loans');

  console.log('Writing installments...');
  await commitWrites(db, generated.installmentWrites, 'installments');

  console.log('Writing payments...');
  await commitWrites(db, generated.paymentWrites, 'payments');

  console.log('Writing lenderBorrowers...');
  await commitWrites(db, generated.lenderBorrowerWrites, 'lenderBorrowers');

  console.log('Updating user aggregates...');
  await commitWrites(db, aggregateWrites, 'user aggregate updates');

  if (options.backfillMissing) {
    console.log('Running optional lender-scope backfill for existing collections...');
    await backfillLenderScope(db, generated.loanMeta, options.deepBackfill);
  }

  console.log('');
  console.log('Seed complete.');
  console.log(`users: ${userWrites.length}`);
  console.log(`ads: ${generated.counts.ads}`);
  console.log(`loanRequests: ${generated.counts.loanRequests}`);
  console.log(`loans: ${generated.counts.loans}`);
  console.log(`installments: ${generated.counts.installments}`);
  console.log(`payments: ${generated.counts.payments}`);
  console.log(`lenderBorrowers: ${generated.lenderBorrowerWrites.length}`);
}

main().catch((error) => {
  console.error('Seed failed:', error);
  process.exitCode = 1;
});
