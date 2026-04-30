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

const bcrypt = require('bcrypt');
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
const DEFAULT_USER_PASSWORD = 'SmartCredit@123';
const MAX_BATCH_SIZE = 400;

const PURPOSES = ['education', 'business', 'medical', 'personal', 'vehicle', 'home'];
const LOCATIONS = [
  'Colombo', 'Kandy', 'Galle', 'Negombo', 'Kurunegala', 'Jaffna',
  'Matara', 'Kalutara', 'Anuradhapura', 'Ratnapura', 'Batticaloa', 'Badulla'
];
const PAYMENT_TYPES = ['qr', 'receipt', 'manual'];
const DISPUTE_CATEGORIES = ['payment', 'fraud', 'service', 'other'];
const DISPUTE_PRIORITIES = ['low', 'medium', 'high', 'critical'];
const DISPUTE_STATUSES = ['open', 'in-progress', 'escalated', 'resolved'];
const DISPUTE_REASON_BY_CATEGORY = {
  payment: 'Borrower says repayment was made but lender has not acknowledged it.',
  fraud: 'Borrower reported suspicious lender behavior during the loan process.',
  service: 'Borrower raised a service complaint about lender communication.',
  other: 'Borrower requested admin review for an unusual loan issue.'
};
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
 * @property {string} emailLower
 * @property {string} phoneNormalized
 * @property {string} passwordHash
 * @property {number} creditScore
 * @property {number} rating
 * @property {number} totalLoansCompleted
 * @property {number} totalAmountLent
 * @property {number} totalAmountBorrowed
 * @property {"approved"} kycStatus
 * @property {"active"} accountStatus
 * @property {"local"} authProvider
 * @property {FirebaseFirestore.Timestamp} createdAt
 * @property {FirebaseFirestore.Timestamp} updatedAt
 */

/**
 * @typedef {Object} AdDoc
 * @property {string} adId
 * @property {string} lenderId
 * @property {number} maxAmount
 * @property {number} preferredInterestRate
 * @property {number} minTenureMonths
 * @property {number} maxTenureMonths
 * @property {string[]} preferredPurposes
 * @property {string} location
 * @property {"active"} status
 * @property {FirebaseFirestore.Timestamp} createdAt
 * @property {FirebaseFirestore.Timestamp} expiresAt
 * @property {string} lenderName
 * @property {string} lenderPhotoURL
 * @property {number} lenderRating
 */

/**
 * @typedef {Object} LoanRequestDoc
 * @property {string} requestId
 * @property {string} adId
 * @property {string} borrowerId
 * @property {number} amount
 * @property {number} tenureMonths
 * @property {string} purpose
 * @property {"accepted"} status
 * @property {FirebaseFirestore.Timestamp} createdAt
 * @property {string} borrowerName
 * @property {string} borrowerPhotoURL
 * @property {number} borrowerRating
 * @property {number} borrowerCreditScore
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

/**
 * @typedef {Object} DisputeDoc
 * @property {string} disputeId
 * @property {string} disputeCode
 * @property {string} transactionId
 * @property {string} loanId
 * @property {string} lenderId
 * @property {string} borrowerId
 * @property {string} lenderName
 * @property {string} borrowerName
 * @property {string} lenderPhotoURL
 * @property {string} borrowerPhotoURL
 * @property {string} raisedBy
 * @property {string} raisedByUserId
 * @property {"borrower"|"lender"} raisedByRole
 * @property {string} againstUser
 * @property {string} againstUserId
 * @property {"borrower"|"lender"} againstUserRole
 * @property {string} title
 * @property {string} description
 * @property {"payment"|"fraud"|"service"|"other"} category
 * @property {"open"|"in-progress"|"resolved"|"escalated"|"closed"} status
 * @property {"low"|"medium"|"high"|"critical"} priority
 * @property {number} disputedAmount
 * @property {string[]} evidenceUrls
 * @property {Array<{status: string, note: string, at: FirebaseFirestore.Timestamp, by: string}>} statusHistory
 * @property {FirebaseFirestore.Timestamp} createdAt
 * @property {FirebaseFirestore.Timestamp} updatedAt
 * @property {string=} assignedTo
 * @property {FirebaseFirestore.Timestamp=} resolvedAt
 * @property {string=} resolution
 * @property {FirebaseFirestore.Timestamp=} escalatedAt
 * @property {string=} escalationReason
 * @property {string=} notes
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

function normalizeEmail(email) {
  return String(email ?? '').trim().toLowerCase();
}

function normalizePhone(phone) {
  const raw = String(phone ?? '').trim();
  const digitsAndPlus = raw.replace(/[^\d+]/g, '');
  let normalized = digitsAndPlus;

  if (normalized.startsWith('+')) {
    normalized = `+${normalized.slice(1).replace(/\D/g, '')}`;
  } else {
    normalized = normalized.replace(/\D/g, '');

    if (normalized.startsWith('0')) {
      normalized = `+94${normalized.slice(1)}`;
    } else if (normalized.startsWith('94')) {
      normalized = `+${normalized}`;
    } else if (normalized.length === 9) {
      normalized = `+94${normalized}`;
    } else {
      normalized = `+${normalized}`;
    }
  }

  return normalized;
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

async function createUsers(db, now, rng) {
  /** @type {Map<string, UserDoc>} */
  const lenders = new Map();
  /** @type {Map<string, UserDoc>} */
  const borrowers = new Map();
  const writes = [];
  const passwordHash = await bcrypt.hash(DEFAULT_USER_PASSWORD, 10);

  for (let i = 1; i <= 15; i += 1) {
    const uid = `lender_${pad(i, 3)}`;
    const fullName = buildName(i);
    const createdAt = addDays(now, -randomInt(rng, 120, 660));
    const phone = phoneNumber(i);
    const email = emailFromName(fullName, `l${pad(i, 2)}`);
    /** @type {UserDoc} */
    const lender = {
      uid,
      role: ['lender'],
      fullName,
      photoURL: photoURL(uid),
      phone,
      email,
      emailLower: normalizeEmail(email),
      phoneNormalized: normalizePhone(phone),
      passwordHash,
      creditScore: randomInt(rng, 690, 840),
      rating: randomFloat(rng, 4.2, 5, 1),
      totalLoansCompleted: 0,
      totalAmountLent: 0,
      totalAmountBorrowed: 0,
      kycStatus: 'approved',
      accountStatus: 'active',
      authProvider: 'local',
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
    const phone = phoneNumber(i + 50);
    const email = emailFromName(fullName, `b${pad(i, 2)}`);
    /** @type {UserDoc} */
    const borrower = {
      uid,
      role: ['borrower'],
      fullName,
      photoURL: photoURL(uid),
      phone,
      email,
      emailLower: normalizeEmail(email),
      phoneNormalized: normalizePhone(phone),
      passwordHash,
      creditScore: randomInt(rng, 480, 790),
      rating: randomFloat(rng, 3.8, 5, 1),
      totalLoansCompleted: 0,
      totalAmountLent: 0,
      totalAmountBorrowed: 0,
      kycStatus: 'approved',
      accountStatus: 'active',
      authProvider: 'local',
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
  const disputeWrites = [];
  const disputeCandidates = [];
  const lenderBorrowerMap = new Map();
  /** @type {Map<string, { lenderId: string, borrowerId: string }>} */
  const loanMeta = new Map();

  let adsCount = 0;
  let requestsCount = 0;
  let loansCount = 0;
  let installmentsCount = 0;
  let paymentsCount = 0;
  let disputesCount = 0;

  const borrowerAssignments = borrowerList.slice();
  let borrowerPointer = 0;

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
      const adCreatedAt = addDays(now, -randomInt(rng, 100, 540));
      const requestCreatedAt = addDays(adCreatedAt, randomInt(rng, 1, 20));
      const createdAt = addDays(requestCreatedAt, randomInt(rng, 1, 12));
      const signedAt = addDays(createdAt, randomInt(rng, 1, 5));
      const startDate = addDays(signedAt, randomInt(rng, 1, 7));
      const isCompleted = loanOffset < entry.completedExtra;
      const loanStatus = isCompleted ? 'completed' : 'active';
      const firstInstallmentDate = addMonths(startDate, 1);
      const installmentAmount = Math.round(totalRepayable / tenureMonths);

      const paidInstallmentsBase = isCompleted
        ? tenureMonths
        : Math.min(tenureMonths - 1, randomInt(rng, 1, Math.max(2, tenureMonths - 2)));
      const partialInstallmentNumber = !isCompleted && maybe(rng, 0.5)
        ? Math.min(tenureMonths, paidInstallmentsBase + 1)
        : null;

      const nextDueDateDate = isCompleted
        ? addMonths(firstInstallmentDate, tenureMonths - 1)
        : addMonths(firstInstallmentDate, paidInstallmentsBase);

      /** @type {AdDoc} */
      const adDoc = {
        adId: adRef.id,
        lenderId: lender.uid,
        maxAmount: Math.max(principalAmount, roundCurrency(principalAmount + randomInt(rng, 30000, 180000))),
        preferredInterestRate: interestRate,
        minTenureMonths: Math.min(6, tenureMonths),
        maxTenureMonths: tenureMonths,
        preferredPurposes: pickPurposes(rng),
        location: pick(rng, LOCATIONS),
        status: 'active',
        createdAt: ts(adCreatedAt),
        expiresAt: ts(addDays(adCreatedAt, 180)),
        lenderName: lender.fullName,
        lenderPhotoURL: lender.photoURL,
        lenderRating: lender.rating
      };

      /** @type {LoanRequestDoc} */
      const requestDoc = {
        requestId: requestRef.id,
        adId: adRef.id,
        borrowerId: borrower.uid,
        amount: principalAmount,
        tenureMonths,
        purpose,
        status: 'accepted',
        createdAt: ts(requestCreatedAt),
        borrowerName: borrower.fullName,
        borrowerPhotoURL: borrower.photoURL,
        borrowerRating: borrower.rating,
        borrowerCreditScore: borrower.creditScore
      };

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

        if (
          paymentsForInstallment.length > 0 &&
          disputeCandidates.length < 18 &&
          (installmentNumber === 1 || maybe(rng, 0.04))
        ) {
          const paymentWrite = pick(rng, paymentsForInstallment);
          disputeCandidates.push({
            paymentWrite,
            loanId: loanRef.id,
            lender,
            borrower,
            installmentNumber,
            amount: paymentWrite.data.amount
          });
        }
      }

      console.log(
        `Created loan #${loansCount} for borrower ${borrower.uid} with lender ${lender.uid} (${loanStatus})`
      );
    }

    if (entry.totalLoans === 0) {
      const idleAdRef = db.collection(ADS_COLLECTION).doc();
      const idleCreatedAt = addDays(now, -randomInt(rng, 60, 240));
      adWrites.push({
        ref: idleAdRef,
        data: {
          adId: idleAdRef.id,
          lenderId: lender.uid,
          maxAmount: roundCurrency(randomInt(rng, 80000, 450000)),
          preferredInterestRate: randomFloat(rng, 9, 18, 1),
          minTenureMonths: 6,
          maxTenureMonths: pick(rng, [12, 18, 24, 36]),
          preferredPurposes: pickPurposes(rng),
          location: pick(rng, LOCATIONS),
          status: 'active',
          createdAt: ts(idleCreatedAt),
          expiresAt: ts(addDays(idleCreatedAt, 180)),
          lenderName: lender.fullName,
          lenderPhotoURL: lender.photoURL,
          lenderRating: lender.rating
        }
      });
      adsCount += 1;
      console.log(`Created ad-only lender profile for ${lender.uid}`);
    }

    console.log(
      `Prepared lender group ${distributionIndex + 1}/15 with ${entry.totalLoans} loans`
    );
  });

  disputeCandidates.slice(0, 12).forEach((candidate, index) => {
    const disputeRef = db.collection(DISPUTES_COLLECTION).doc();
    const category = DISPUTE_CATEGORIES[index % DISPUTE_CATEGORIES.length];
    const status = DISPUTE_STATUSES[index % DISPUTE_STATUSES.length];
    const priority = DISPUTE_PRIORITIES[(index + 1) % DISPUTE_PRIORITIES.length];
    const createdAt = addDays(now, -randomInt(rng, 1, 45));
    const updatedAt = addDays(createdAt, randomInt(rng, 1, 7));
    const assignedTo = status === 'open' ? null : 'admin-review-team';

    /** @type {DisputeDoc} */
    const disputeDoc = {
      disputeId: disputeRef.id,
      disputeCode: `DSP-${now.getFullYear()}-${pad(index + 1, 3)}`,
      transactionId: candidate.paymentWrite.data.paymentId,
      loanId: candidate.loanId,
      lenderId: candidate.lender.uid,
      borrowerId: candidate.borrower.uid,
      lenderName: candidate.lender.fullName,
      borrowerName: candidate.borrower.fullName,
      lenderPhotoURL: candidate.lender.photoURL,
      borrowerPhotoURL: candidate.borrower.photoURL,
      raisedBy: candidate.borrower.fullName,
      raisedByUserId: candidate.borrower.uid,
      raisedByRole: 'borrower',
      againstUser: candidate.lender.fullName,
      againstUserId: candidate.lender.uid,
      againstUserRole: 'lender',
      title: `${category} dispute for installment ${candidate.installmentNumber}`,
      description: DISPUTE_REASON_BY_CATEGORY[category],
      category,
      status,
      priority,
      disputedAmount: candidate.amount,
      evidenceUrls: [
        `https://example.com/disputes/${disputeRef.id}/receipt.jpg`,
        `https://example.com/disputes/${disputeRef.id}/chat-summary.pdf`
      ],
      statusHistory: [
        {
          status: 'open',
          note: 'Dispute submitted by borrower',
          at: ts(createdAt),
          by: candidate.borrower.uid
        }
      ],
      createdAt: ts(createdAt),
      updatedAt: ts(updatedAt),
      notes: 'Seeded dispute for admin review workflow'
    };

    if (assignedTo) {
      disputeDoc.assignedTo = assignedTo;
      disputeDoc.statusHistory.push({
        status,
        note: `Dispute moved to ${status}`,
        at: ts(updatedAt),
        by: assignedTo
      });
    }

    if (status === 'resolved') {
      disputeDoc.resolvedAt = ts(updatedAt);
      disputeDoc.resolution = 'Resolved after reviewing payment and lender records';
    }

    if (status === 'escalated') {
      disputeDoc.escalatedAt = ts(updatedAt);
      disputeDoc.escalationReason = 'Escalated for senior admin investigation';
    }

    disputeWrites.push({ ref: disputeRef, data: disputeDoc });
    disputesCount += 1;
  });

  return {
    adWrites,
    requestWrites,
    loanWrites,
    installmentWrites,
    paymentWrites,
    disputeWrites,
    lenderBorrowerWrites: Array.from(lenderBorrowerMap.values()).map((relation) => ({
      ref: db.collection(LENDER_BORROWERS_COLLECTION).doc(relation.relationId),
      data: relation
    })),
    loanMeta,
    counts: {
      ads: adsCount,
      loanRequests: requestsCount,
      loans: loansCount,
      installments: installmentsCount,
      payments: paymentsCount,
      disputes: disputesCount
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

  const { lenders, borrowers, writes: userWrites } = await createUsers(db, now, rng);
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

  console.log('Writing disputes...');
  await commitWrites(db, generated.disputeWrites, 'disputes');

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
  console.log(`shared seeded-user password: ${DEFAULT_USER_PASSWORD}`);
  console.log(`users: ${userWrites.length}`);
  console.log(`ads: ${generated.counts.ads}`);
  console.log(`loanRequests: ${generated.counts.loanRequests}`);
  console.log(`loans: ${generated.counts.loans}`);
  console.log(`installments: ${generated.counts.installments}`);
  console.log(`payments: ${generated.counts.payments}`);
  console.log(`disputes: ${generated.counts.disputes}`);
  console.log(`lenderBorrowers: ${generated.lenderBorrowerWrites.length}`);
}

main().catch((error) => {
  console.error('Seed failed:', error);
  process.exitCode = 1;
});
