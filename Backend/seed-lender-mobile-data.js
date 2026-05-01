/**
 * seed-lender-mobile-data.js
 * ─────────────────────────────────────────────────────────────────────────────
 * ADDITIVE seed — does NOT delete existing data.
 *
 * Adds the following missing collections needed by the lender mobile app:
 *   1. loanOffers     — 5 offers for lender_004 (and 2 for other lenders)
 *   2. loanRequests   — 6 PENDING requests visible to lender_004
 *                       (targeted + marketplace matches)
 *
 * Run with:
 *   node seed-lender-mobile-data.js
 *   node seed-lender-mobile-data.js --key=./your-service-account-key.json
 *
 * Prereqs: seed-mock-data.js must have been run first (creates users/ads/loans).
 */

'use strict';

const fs   = require('fs');
const path = require('path');
const admin = require('firebase-admin');

// ── Config ────────────────────────────────────────────────
const DEFAULT_KEY_PATH = './your-service-account-key.json';
const LENDER_ID        = 'lender_004';   // the app's current auth placeholder

// ── CLI args ──────────────────────────────────────────────
const args = process.argv.slice(2);
let keyPath = DEFAULT_KEY_PATH;
args.forEach(arg => {
  if (arg.startsWith('--key=')) keyPath = arg.slice('--key='.length);
});

// ── Firebase init ─────────────────────────────────────────
const resolvedKey = path.resolve(keyPath);
if (!fs.existsSync(resolvedKey)) {
  console.error(`❌  Service-account key not found: ${resolvedKey}`);
  console.error('    Run: node seed-lender-mobile-data.js --key=./your-service-account-key.json');
  process.exit(1);
}

admin.initializeApp({
  credential: admin.credential.cert(require(resolvedKey)),
});
const db = admin.firestore();

// ── Helpers ───────────────────────────────────────────────
function ts(date) { return admin.firestore.Timestamp.fromDate(date); }
function daysAgo(n) { return new Date(Date.now() - n * 86400_000); }
function daysAhead(n) { return new Date(Date.now() + n * 86400_000); }

// ── 1. Loan Offers ────────────────────────────────────────
const LOAN_OFFERS = [
  {
    lenderId:     LENDER_ID,
    loanType:     'personal',
    minAmount:    25000,
    maxAmount:    500000,
    interestRate: 14.5,
    tenureMonths: 24,
    active:       true,
    status:       'active',
    description:  'Flexible personal loans with competitive interest rates and quick approval.',
    createdAt:    ts(daysAgo(60)),
    updatedAt:    ts(daysAgo(5)),
  },
  {
    lenderId:     LENDER_ID,
    loanType:     'business',
    minAmount:    100000,
    maxAmount:    2000000,
    interestRate: 12.0,
    tenureMonths: 36,
    active:       true,
    status:       'active',
    description:  'SME business growth financing with flexible repayment options.',
    createdAt:    ts(daysAgo(45)),
    updatedAt:    ts(daysAgo(3)),
  },
  {
    lenderId:     LENDER_ID,
    loanType:     'education',
    minAmount:    20000,
    maxAmount:    300000,
    interestRate: 10.5,
    tenureMonths: 18,
    active:       true,
    status:       'active',
    description:  'Education financing for university and professional courses.',
    createdAt:    ts(daysAgo(90)),
    updatedAt:    ts(daysAgo(10)),
  },
  {
    lenderId:     LENDER_ID,
    loanType:     'vehicle',
    minAmount:    50000,
    maxAmount:    800000,
    interestRate: 16.0,
    tenureMonths: 30,
    active:       false,
    status:       'withdrawn',
    description:  'Vehicle financing for two-wheelers and cars.',
    createdAt:    ts(daysAgo(120)),
    updatedAt:    ts(daysAgo(20)),
  },
  {
    lenderId:     LENDER_ID,
    loanType:     'home',
    minAmount:    200000,
    maxAmount:    5000000,
    interestRate: 11.5,
    tenureMonths: 60,
    active:       true,
    status:       'active',
    description:  'Home renovation and construction financing.',
    createdAt:    ts(daysAgo(30)),
    updatedAt:    ts(daysAgo(2)),
  },
  // A couple of offers for other lenders (so the system has variety)
  {
    lenderId:     'lender_001',
    loanType:     'personal',
    minAmount:    10000,
    maxAmount:    200000,
    interestRate: 18.0,
    tenureMonths: 12,
    active:       true,
    status:       'active',
    description:  'Fast personal loans, approved within 24 hours.',
    createdAt:    ts(daysAgo(50)),
    updatedAt:    ts(daysAgo(1)),
  },
  {
    lenderId:     'lender_002',
    loanType:     'business',
    minAmount:    50000,
    maxAmount:    1000000,
    interestRate: 13.5,
    tenureMonths: 24,
    active:       true,
    status:       'active',
    description:  'Working capital solutions for growing businesses.',
    createdAt:    ts(daysAgo(40)),
    updatedAt:    ts(daysAgo(7)),
  },
];

// ── 2. Pending Loan Requests visible to lender_004 ────────
// Some targeted directly, some via matchedLenderIds
const PENDING_REQUESTS = [
  {
    requestId:        'req_pending_001',
    adId:             null,
    borrowerId:       'borrower_020',
    borrowerName:     'Rashmi Perera',
    borrowerCreditScore: 720,
    borrowerKycStatus: 'approved',
    amount:           150000,
    tenureMonths:     12,
    purpose:          'business',
    purposeCategory:  'business',
    status:           'open',
    targetLenderId:   LENDER_ID,
    matchedLenderIds: [LENDER_ID],
    suggestedInterestRate: 14.0,
    urgency:          'high',
    monthlyIncome:    85000,
    incomeSource:     'business',
    requestedRegion:  'Colombo',
    collateralOffered: false,
    notes:            'Expanding my home bakery business. Have 3 years of steady income.',
    createdAt:        ts(daysAgo(3)),
    updatedAt:        ts(daysAgo(3)),
  },
  {
    requestId:        'req_pending_002',
    adId:             null,
    borrowerId:       'borrower_021',
    borrowerName:     'Anudi Fernando',
    borrowerCreditScore: 680,
    borrowerKycStatus: 'approved',
    amount:           75000,
    tenureMonths:     6,
    purpose:          'personal',
    purposeCategory:  'personal',
    status:           'under_review',
    targetLenderId:   LENDER_ID,
    matchedLenderIds: [LENDER_ID],
    suggestedInterestRate: 15.5,
    urgency:          'medium',
    monthlyIncome:    55000,
    incomeSource:     'salary',
    requestedRegion:  'Kandy',
    collateralOffered: true,
    notes:            'Need funds for medical expenses. Attached salary slips for last 6 months.',
    createdAt:        ts(daysAgo(5)),
    updatedAt:        ts(daysAgo(4)),
  },
  {
    requestId:        'req_pending_003',
    adId:             null,
    borrowerId:       'borrower_022',
    borrowerName:     'Sasindu Bandara',
    borrowerCreditScore: 750,
    borrowerKycStatus: 'approved',
    amount:           300000,
    tenureMonths:     24,
    purpose:          'education',
    purposeCategory:  'education',
    status:           'matched',
    targetLenderId:   null,
    matchedLenderIds: [LENDER_ID, 'lender_001'],
    suggestedInterestRate: 11.0,
    urgency:          'medium',
    monthlyIncome:    120000,
    incomeSource:     'business',
    requestedRegion:  'Galle',
    collateralOffered: false,
    notes:            'University degree overseas. Full scholarship already secured for 50% of costs.',
    createdAt:        ts(daysAgo(7)),
    updatedAt:        ts(daysAgo(6)),
  },
  {
    requestId:        'req_pending_004',
    adId:             null,
    borrowerId:       'borrower_023',
    borrowerName:     'Thilini Silva',
    borrowerCreditScore: 640,
    borrowerKycStatus: 'approved',
    amount:           50000,
    tenureMonths:     6,
    purpose:          'medical',
    purposeCategory:  'emergency',
    status:           'open',
    targetLenderId:   LENDER_ID,
    matchedLenderIds: [LENDER_ID],
    suggestedInterestRate: 16.0,
    urgency:          'critical',
    monthlyIncome:    40000,
    incomeSource:     'salary',
    requestedRegion:  'Negombo',
    collateralOffered: false,
    notes:            'Emergency surgery scheduled. Need immediate funding.',
    createdAt:        ts(daysAgo(1)),
    updatedAt:        ts(daysAgo(1)),
  },
  {
    requestId:        'req_pending_005',
    adId:             null,
    borrowerId:       'borrower_024',
    borrowerName:     'Pasindu Jayasinghe',
    borrowerCreditScore: 710,
    borrowerKycStatus: 'approved',
    amount:           450000,
    tenureMonths:     30,
    purpose:          'vehicle',
    purposeCategory:  'asset_purchase',
    status:           'under_review',
    targetLenderId:   null,
    matchedLenderIds: [LENDER_ID, 'lender_003'],
    suggestedInterestRate: 15.0,
    urgency:          'low',
    monthlyIncome:    95000,
    incomeSource:     'salary',
    requestedRegion:  'Kurunegala',
    collateralOffered: true,
    notes:            'Purchasing a second-hand lorry for goods transport business.',
    createdAt:        ts(daysAgo(10)),
    updatedAt:        ts(daysAgo(9)),
  },
  {
    requestId:        'req_pending_006',
    adId:             null,
    borrowerId:       'borrower_025',
    borrowerName:     'Madushi Rathnayake',
    borrowerCreditScore: 760,
    borrowerKycStatus: 'approved',
    amount:           200000,
    tenureMonths:     18,
    purpose:          'home',
    purposeCategory:  'housing',
    status:           'matched',
    targetLenderId:   null,
    matchedLenderIds: [LENDER_ID, 'lender_002', 'lender_005'],
    suggestedInterestRate: 12.5,
    urgency:          'medium',
    monthlyIncome:    110000,
    incomeSource:     'salary',
    requestedRegion:  'Colombo',
    collateralOffered: true,
    notes:            'Home renovation — kitchen and bathroom. Have prior loan history with good repayment.',
    createdAt:        ts(daysAgo(14)),
    updatedAt:        ts(daysAgo(13)),
  },
];

// ── Main ──────────────────────────────────────────────────
async function main() {
  console.log('🌱  Starting lender mobile data seed...\n');

  // 1. Write loanOffers
  console.log(`📦  Writing ${LOAN_OFFERS.length} loan offers...`);
  let offerCount = 0;
  for (const offer of LOAN_OFFERS) {
    // Use fixed ID for lender_004's offers so re-running won't duplicate
    const docId = offer.lenderId === LENDER_ID
      ? `loanOffer_${LENDER_ID}_${offer.loanType}`
      : undefined;

    if (docId) {
      await db.collection('loanOffers').doc(docId).set(offer);
    } else {
      await db.collection('loanOffers').add(offer);
    }
    offerCount++;
    console.log(`  ✓ ${offer.loanType} offer for ${offer.lenderId}`);
  }
  console.log(`  → ${offerCount} loan offers written\n`);

  // 2. Write pending loanRequests
  console.log(`📦  Writing ${PENDING_REQUESTS.length} pending loan requests...`);
  let reqCount = 0;
  for (const req of PENDING_REQUESTS) {
    // Use fixed ID so re-running won't duplicate
    await db.collection('loanRequests').doc(req.requestId).set(req);
    reqCount++;
    console.log(`  ✓ ${req.requestId} — ${req.borrowerName} (${req.status})`);
  }
  console.log(`  → ${reqCount} pending requests written\n`);

  // 3. Ensure lender_004 user doc has correct fields for profile screen
  console.log('👤  Ensuring lender_004 user profile is complete...');
  await db.collection('users').doc(LENDER_ID).set({
    uid:           LENDER_ID,
    role:          ['lender'],
    fullName:      'Sanduni Nawaratne',
    email:         'sanduni.nawaratne.l04@smartcredit.lk',
    phone:         '+94710000292',
    city:          'Colombo',
    district:      'Colombo',
    businessName:  'Nawaratne Finance',
    responseTimeHours: 4,
    preferredRegions: ['Colombo', 'Gampaha', 'Kalutara'],
    creditScore:   775,
    rating:        4.7,
    kycStatus:     'approved',
    status:        'active',
    totalLoansCompleted: 3,
    totalAmountLent: 1250000,
    totalAmountBorrowed: 0,
    availableCapital: 3000000,
    createdAt:     ts(daysAgo(400)),
    updatedAt:     ts(daysAgo(2)),
  }, { merge: true });
  console.log('  ✓ lender_004 profile updated\n');

  console.log('✅  Seed complete!');
  console.log('');
  console.log('What was seeded:');
  console.log(`  • ${offerCount} loan offers (loanOffers collection)`);
  console.log(`  • ${reqCount} pending requests (loanRequests collection) visible to ${LENDER_ID}`);
  console.log(`  • lender_004 user profile enriched with complete fields`);
}

main()
  .then(() => process.exit(0))
  .catch(err => {
    console.error('❌  Seed failed:', err);
    process.exit(1);
  });
