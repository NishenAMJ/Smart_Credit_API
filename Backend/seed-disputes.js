const admin = require('firebase-admin');
const serviceAccount = require('./firebase-service-account.json');

// Initialize Firebase Admin if not already initialized
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
}

const db = admin.firestore();

async function seedDisputes() {
  try {
    console.log('Starting Dispute seeding...');

    const disputes = [
      {
        id: 'dispute-001',
        data: {
          transactionId: 'txn-12345',
          raisedBy: 'sENbwBesC03DXcqkQEzz', // John Doe (borrower)
          againstUser: '9VV5dbTIiG4oIvi2Np7K', // Bob Smith (lender)
          description: 'Lender did not disburse the agreed loan amount. Only received 80% of promised funds.',
          category: 'payment',
          status: 'open',
          priority: 'high',
          createdAt: admin.firestore.Timestamp.now()
        }
      },
      {
        id: 'dispute-002',
        data: {
          transactionId: 'txn-67890',
          raisedBy: '9VV5dbTIiG4oIvi2Np7K', // Bob Smith (lender)
          againstUser: 'sENbwBesC03DXcqkQEzz', // John Doe (borrower)
          description: 'Borrower has not made payment for 2 months despite multiple reminders.',
          category: 'payment',
          status: 'open',
          priority: 'critical',
          createdAt: admin.firestore.Timestamp.now()
        }
      },
      {
        id: 'dispute-003',
        data: {
          transactionId: 'txn-11111',
          raisedBy: 'sENbwBesC03DXcqkQEzz', // John Doe
          againstUser: 'B9gkhn6B4mS4Y6UfhRH9', // Mike Johnson
          description: 'Suspected fraudulent transaction. User requested loan but provided fake documents.',
          category: 'fraud',
          status: 'in-progress',
          priority: 'critical',
          createdAt: admin.firestore.Timestamp.fromDate(new Date(Date.now() - 2 * 24 * 60 * 60 * 1000)),
          updatedAt: admin.firestore.Timestamp.fromDate(new Date(Date.now() - 1 * 24 * 60 * 60 * 1000))
        }
      },
      {
        id: 'dispute-004',
        data: {
          transactionId: 'txn-22222',
          raisedBy: '9VV5dbTIiG4oIvi2Np7K', // Bob Smith
          againstUser: 'sENbwBesC03DXcqkQEzz', // John Doe
          description: 'Poor service quality. Platform failed to notify about payment due dates.',
          category: 'service',
          status: 'open',
          priority: 'medium',
          createdAt: admin.firestore.Timestamp.now()
        }
      },
      {
        id: 'dispute-005',
        data: {
          transactionId: 'txn-33333',
          raisedBy: 'B9gkhn6B4mS4Y6UfhRH9', // Mike Johnson
          againstUser: '9VV5dbTIiG4oIvi2Np7K', // Bob Smith
          description: 'Interest rate was changed without prior notice. Original agreement was 7% but charged 9%.',
          category: 'payment',
          status: 'resolved',
          priority: 'medium',
          createdAt: admin.firestore.Timestamp.fromDate(new Date(Date.now() - 5 * 24 * 60 * 60 * 1000)),
          resolvedAt: admin.firestore.Timestamp.fromDate(new Date(Date.now() - 2 * 24 * 60 * 60 * 1000)),
          resolution: 'Refunded excess interest charged. Lender agreed to honor original 7% rate.',
          notes: 'Dispute resolved amicably. Both parties satisfied with outcome.',
          updatedAt: admin.firestore.Timestamp.fromDate(new Date(Date.now() - 2 * 24 * 60 * 60 * 1000))
        }
      },
      {
        id: 'dispute-006',
        data: {
          transactionId: 'txn-44444',
          raisedBy: 'sENbwBesC03DXcqkQEzz', // John Doe
          againstUser: '9VV5dbTIiG4oIvi2Np7K', // Bob Smith
          description: 'Harassing behavior from lender. Received threatening messages and calls.',
          category: 'other',
          status: 'escalated',
          priority: 'critical',
          createdAt: admin.firestore.Timestamp.fromDate(new Date(Date.now() - 4 * 24 * 60 * 60 * 1000)),
          escalatedAt: admin.firestore.Timestamp.fromDate(new Date(Date.now() - 3 * 24 * 60 * 60 * 1000)),
          escalationReason: 'Serious harassment case requiring legal review and immediate action.',
          notes: 'Legal team notified. User safety is priority.',
          updatedAt: admin.firestore.Timestamp.fromDate(new Date(Date.now() - 3 * 24 * 60 * 60 * 1000))
        }
      }
    ];

    for (const dispute of disputes) {
      await db.collection('disputes').doc(dispute.id).set(dispute.data);
      console.log(`✓ Created Dispute: ${dispute.id} (${dispute.data.category} - ${dispute.data.status} - ${dispute.data.priority})`);
    }

    console.log('\n✅ Successfully seeded', disputes.length, 'disputes');
    console.log('\n📋 Dispute IDs for Testing:');
    console.log('\nOpen Disputes (for resolve/escalate):');
    console.log('  - dispute-001 (Payment - High Priority)');
    console.log('  - dispute-002 (Payment - Critical Priority)');
    console.log('  - dispute-004 (Service - Medium Priority)');
    console.log('\nIn Progress:');
    console.log('  - dispute-003 (Fraud - Critical)');
    console.log('\nAlready Processed:');
    console.log('  - dispute-005 (Resolved)');
    console.log('  - dispute-006 (Escalated)');

  } catch (error) {
    console.error('Error seeding disputes:', error);
  } finally {
    process.exit(0);
  }
}

seedDisputes();
