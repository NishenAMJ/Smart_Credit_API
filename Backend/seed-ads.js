const admin = require('firebase-admin');
const serviceAccount = require('./firebase-service-account.json');

// Initialize Firebase Admin if not already initialized
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
}

const db = admin.firestore();

async function seedAds() {
  try {
    console.log('Starting Ad seeding...');

    const ads = [
      {
        id: 'ad-001',
        data: {
          userId: 'sENbwBesC03DXcqkQEzz', // John Doe (borrower)
          title: 'Need $5000 for Small Business Expansion',
          description: 'Looking to expand my retail business. Need funding for inventory and equipment.',
          amount: 5000,
          interestRate: 8.5,
          duration: 12,
          adType: 'borrower',
          status: 'pending',
          createdAt: admin.firestore.Timestamp.now()
        }
      },
      {
        id: 'ad-002',
        data: {
          userId: '9VV5dbTIiG4oIvi2Np7K', // Bob Smith (lender)
          title: 'Offering $10000 for Short-term Loans',
          description: 'Willing to provide loans up to $10000 with competitive interest rates. Looking for reliable borrowers.',
          amount: 10000,
          interestRate: 7.0,
          duration: 6,
          adType: 'lender',
          status: 'pending',
          createdAt: admin.firestore.Timestamp.now()
        }
      },
      {
        id: 'ad-003',
        data: {
          userId: 'sENbwBesC03DXcqkQEzz', // John Doe (borrower)
          title: 'Emergency Medical Expenses',
          description: 'Need urgent financial assistance for medical treatment. Can repay within 3 months.',
          amount: 3000,
          interestRate: 9.0,
          duration: 3,
          adType: 'borrower',
          status: 'pending',
          createdAt: admin.firestore.Timestamp.now()
        }
      },
      {
        id: 'ad-004',
        data: {
          userId: 'B9gkhn6B4mS4Y6UfhRH9', // Mike Johnson (suspended borrower)
          title: 'Home Renovation Loan Request',
          description: 'Planning to renovate my house. Looking for $8000 loan for 18 months.',
          amount: 8000,
          interestRate: 8.0,
          duration: 18,
          adType: 'borrower',
          status: 'pending',
          createdAt: admin.firestore.Timestamp.now()
        }
      },
      {
        id: 'ad-005',
        data: {
          userId: '9VV5dbTIiG4oIvi2Np7K', // Bob Smith (lender)
          title: 'Investment Opportunity - Multiple Loans Available',
          description: 'Experienced lender offering flexible terms. Available for business and personal loans.',
          amount: 15000,
          interestRate: 6.5,
          duration: 12,
          adType: 'lender',
          status: 'approved',
          createdAt: admin.firestore.Timestamp.fromDate(new Date(Date.now() - 5 * 24 * 60 * 60 * 1000)),
          reviewedAt: admin.firestore.Timestamp.fromDate(new Date(Date.now() - 4 * 24 * 60 * 60 * 1000)),
          approvedAt: admin.firestore.Timestamp.fromDate(new Date(Date.now() - 4 * 24 * 60 * 60 * 1000)),
          notes: 'Verified lender with good track record',
          updatedAt: admin.firestore.Timestamp.fromDate(new Date(Date.now() - 4 * 24 * 60 * 60 * 1000))
        }
      },
      {
        id: 'ad-006',
        data: {
          userId: 'sENbwBesC03DXcqkQEzz', // John Doe (borrower)
          title: 'Education Loan for Masters Degree',
          description: 'Need funding for tuition fees. Will repay after graduation.',
          amount: 12000,
          interestRate: 7.5,
          duration: 24,
          adType: 'borrower',
          status: 'rejected',
          createdAt: admin.firestore.Timestamp.fromDate(new Date(Date.now() - 3 * 24 * 60 * 60 * 1000)),
          reviewedAt: admin.firestore.Timestamp.fromDate(new Date(Date.now() - 2 * 24 * 60 * 60 * 1000)),
          rejectedAt: admin.firestore.Timestamp.fromDate(new Date(Date.now() - 2 * 24 * 60 * 60 * 1000)),
          rejectionReason: 'Insufficient credit history and income proof',
          updatedAt: admin.firestore.Timestamp.fromDate(new Date(Date.now() - 2 * 24 * 60 * 60 * 1000))
        }
      }
    ];

    for (const ad of ads) {
      await db.collection('ads').doc(ad.id).set(ad.data);
      console.log(`✓ Created Ad: ${ad.id} (${ad.data.adType} - ${ad.data.status}) - ${ad.data.title}`);
    }

    console.log('\n✅ Successfully seeded', ads.length, 'ads');
    console.log('\n📋 Ad IDs for Testing:');
    console.log('\nPending Ads (for approval/rejection):');
    console.log('  - ad-001 (Borrower - $5000 Small Business)');
    console.log('  - ad-002 (Lender - $10000 Short-term)');
    console.log('  - ad-003 (Borrower - $3000 Medical)');
    console.log('  - ad-004 (Borrower - $8000 Home Renovation)');
    console.log('\nAlready Processed:');
    console.log('  - ad-005 (Approved - Lender)');
    console.log('  - ad-006 (Rejected - Borrower)');

  } catch (error) {
    console.error('Error seeding ads:', error);
  } finally {
    process.exit(0);
  }
}

seedAds();
