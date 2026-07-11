'use strict';

const { getDb } = require('../shared/firebase');
const { commitSetWrites } = require('../shared/firestore-helpers');
const { buildSchemaV2Fixtures } = require('./fixtures');
const { validateFixtures } = require('./validate');

const topLevelWrites = (db, collection, records, idField) =>
  records.map((data) => ({
    ref: db.collection(collection).doc(data[idField]),
    data,
  }));

async function seedSchemaV2() {
  const db = getDb();
  const fixtures = await buildSchemaV2Fixtures();
  const counts = validateFixtures(fixtures);

  const stages = [
    ['users', fixtures.users, 'userId'],
    ['authCredentials', fixtures.authCredentials, 'userId'],
    ['documents', fixtures.documents, 'documentId'],
    ['kycSubmissions', fixtures.kycSubmissions, 'submissionId'],
    ['loanListings', fixtures.loanListings, 'listingId'],
    ['loanApplications', fixtures.loanApplications, 'applicationId'],
    ['loans', fixtures.loans, 'loanId'],
    ['transactions', fixtures.transactions, 'transactionId'],
    ['disputes', fixtures.disputes, 'disputeId'],
    ['notifications', fixtures.notifications, 'notificationId'],
    ['conversations', fixtures.conversations, 'conversationId'],
    ['legalDocuments', fixtures.legalDocuments, 'legalDocumentId'],
    ['legalAcceptances', fixtures.legalAcceptances, 'acceptanceId'],
    ['userLocations', fixtures.userLocations, 'userId'],
    ['auditLogs', fixtures.auditLogs, 'auditLogId'],
  ];

  for (const [collection, records, idField] of stages) {
    await commitSetWrites(
      db,
      topLevelWrites(db, collection, records, idField),
      collection,
    );
  }

  await commitSetWrites(
    db,
    fixtures.installments.map((data) => ({
      ref: db
        .collection('loans')
        .doc(data.loanId)
        .collection('installments')
        .doc(data.installmentId),
      data,
    })),
    'loan installments',
  );
  await commitSetWrites(
    db,
    fixtures.disputeEvents.map((data) => ({
      ref: db
        .collection('disputes')
        .doc(data.disputeId)
        .collection('events')
        .doc(data.eventId),
      data,
    })),
    'dispute events',
  );
  await commitSetWrites(
    db,
    fixtures.messages.map((data) => ({
      ref: db
        .collection('conversations')
        .doc(data.conversationId)
        .collection('messages')
        .doc(data.messageId),
      data,
    })),
    'conversation messages',
  );

  console.log('Schema v2 seed complete. Validation counts:');
  console.log(JSON.stringify(counts, null, 2));
}

if (require.main === module) {
  seedSchemaV2().catch((error) => {
    console.error('Schema v2 seed failed.');
    console.error(error);
    process.exitCode = 1;
  });
}

module.exports = { seedSchemaV2 };
