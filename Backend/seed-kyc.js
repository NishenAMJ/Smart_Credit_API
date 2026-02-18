const admin = require('firebase-admin');
const serviceAccount = require('./firebase-service-account.json');

// Initialize Firebase Admin if not already initialized
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
}

const db = admin.firestore();

async function seedKycDocuments() {
  try {
    console.log('Starting KYC document seeding...');

    const kycDocuments = [
      {
        id: 'kyc-doc-001',
        data: {
          userId: 'sENbwBesC03DXcqkQEzz', // John Doe (borrower)
          documentType: 'National ID',
          documentUrl: 'https://example.com/documents/john-national-id.pdf',
          status: 'pending',
          submittedAt: admin.firestore.Timestamp.now()
        }
      },
      {
        id: 'kyc-doc-002',
        data: {
          userId: 'sENbwBesC03DXcqkQEzz', // John Doe (borrower)
          documentType: 'Proof of Address',
          documentUrl: 'https://example.com/documents/john-address-proof.pdf',
          status: 'pending',
          submittedAt: admin.firestore.Timestamp.now()
        }
      },
      {
        id: 'kyc-doc-003',
        data: {
          userId: '9VV5dbTIiG4oIvi2Np7K', // Bob Smith (lender)
          documentType: 'Passport',
          documentUrl: 'https://example.com/documents/bob-passport.pdf',
          status: 'pending',
          submittedAt: admin.firestore.Timestamp.now()
        }
      },
      {
        id: 'kyc-doc-004',
        data: {
          userId: 'B9gkhn6B4mS4Y6UfhRH9', // Mike Johnson (suspended borrower)
          documentType: 'Driver License',
          documentUrl: 'https://example.com/documents/mike-license.pdf',
          status: 'approved',
          submittedAt: admin.firestore.Timestamp.fromDate(new Date(Date.now() - 2 * 24 * 60 * 60 * 1000)),
          reviewedAt: admin.firestore.Timestamp.fromDate(new Date(Date.now() - 1 * 24 * 60 * 60 * 1000)),
          notes: 'Document verified successfully'
        }
      },
      {
        id: 'kyc-doc-005',
        data: {
          userId: '9VV5dbTIiG4oIvi2Np7K', // Bob Smith (lender)
          documentType: 'Bank Statement',
          documentUrl: 'https://example.com/documents/bob-bank-statement.pdf',
          status: 'rejected',
          submittedAt: admin.firestore.Timestamp.fromDate(new Date(Date.now() - 3 * 24 * 60 * 60 * 1000)),
          reviewedAt: admin.firestore.Timestamp.fromDate(new Date(Date.now() - 2 * 24 * 60 * 60 * 1000)),
          rejectionReason: 'Document is not clear enough, please submit a higher quality scan'
        }
      }
    ];

    for (const doc of kycDocuments) {
      await db.collection('kyc_documents').doc(doc.id).set(doc.data);
      console.log(`✓ Created KYC document: ${doc.id} (${doc.data.documentType} - ${doc.data.status})`);
    }

    console.log('\n✅ Successfully seeded', kycDocuments.length, 'KYC documents');
    console.log('\nDocument IDs for testing:');
    console.log('- kyc-doc-001 (Pending - National ID)');
    console.log('- kyc-doc-002 (Pending - Proof of Address)');
    console.log('- kyc-doc-003 (Pending - Passport)');
    console.log('- kyc-doc-004 (Approved - Driver License)');
    console.log('- kyc-doc-005 (Rejected - Bank Statement)');
    
    console.log('\nUser IDs with documents:');
    console.log('- sENbwBesC03DXcqkQEzz (John Doe - 2 documents)');
    console.log('- 9VV5dbTIiG4oIvi2Np7K (Bob Smith - 2 documents)');
    console.log('- B9gkhn6B4mS4Y6UfhRH9 (Mike Johnson - 1 document)');

  } catch (error) {
    console.error('Error seeding KYC documents:', error);
  } finally {
    process.exit(0);
  }
}

seedKycDocuments();
