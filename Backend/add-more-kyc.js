const admin = require('firebase-admin');
const serviceAccount = require('./firebase-service-account.json');

// Initialize Firebase Admin if not already initialized
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
}

const db = admin.firestore();

async function addMoreKycDocuments() {
  try {
    console.log('Adding more KYC documents for testing...');

    const newDocuments = [
      {
        id: 'kyc-doc-006',
        data: {
          userId: 'sENbwBesC03DXcqkQEzz', // John Doe
          documentType: 'Bank Statement',
          documentUrl: 'https://example.com/documents/john-bank-statement.pdf',
          status: 'pending',
          submittedAt: admin.firestore.Timestamp.now()
        }
      },
      {
        id: 'kyc-doc-007',
        data: {
          userId: '9VV5dbTIiG4oIvi2Np7K', // Bob Smith
          documentType: 'Utility Bill',
          documentUrl: 'https://example.com/documents/bob-utility-bill.pdf',
          status: 'pending',
          submittedAt: admin.firestore.Timestamp.now()
        }
      },
      {
        id: 'kyc-doc-008',
        data: {
          userId: 'B9gkhn6B4mS4Y6UfhRH9', // Mike Johnson
          documentType: 'National ID',
          documentUrl: 'https://example.com/documents/mike-national-id.pdf',
          status: 'pending',
          submittedAt: admin.firestore.Timestamp.now()
        }
      },
      {
        id: 'kyc-doc-009',
        data: {
          userId: 'sENbwBesC03DXcqkQEzz', // John Doe
          documentType: 'Salary Slip',
          documentUrl: 'https://example.com/documents/john-salary-slip.pdf',
          status: 'pending',
          submittedAt: admin.firestore.Timestamp.now()
        }
      },
      {
        id: 'kyc-doc-010',
        data: {
          userId: '9VV5dbTIiG4oIvi2Np7K', // Bob Smith
          documentType: 'Tax Return',
          documentUrl: 'https://example.com/documents/bob-tax-return.pdf',
          status: 'pending',
          submittedAt: admin.firestore.Timestamp.now()
        }
      }
    ];

    for (const doc of newDocuments) {
      await db.collection('kyc_documents').doc(doc.id).set(doc.data);
      console.log(`✓ Created: ${doc.id} (${doc.data.documentType})`);
    }

    console.log('\n✅ Successfully added', newDocuments.length, 'new KYC documents');
    console.log('\n📋 Document IDs for Testing:');
    console.log('For APPROVE:');
    console.log('  - kyc-doc-003 (Passport)');
    console.log('  - kyc-doc-006 (Bank Statement)');
    console.log('  - kyc-doc-007 (Utility Bill)');
    console.log('  - kyc-doc-008 (National ID)');
    console.log('\nFor REJECT:');
    console.log('  - kyc-doc-009 (Salary Slip)');
    console.log('  - kyc-doc-010 (Tax Return)');

  } catch (error) {
    console.error('Error adding KYC documents:', error);
  } finally {
    process.exit(0);
  }
}

addMoreKycDocuments();
