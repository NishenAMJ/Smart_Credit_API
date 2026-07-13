'use strict';

const { getDb } = require('../shared/firebase');
const { commitSetWrites } = require('../shared/firestore-helpers');
const { buildSchemaV2Fixtures } = require('./fixtures');
const { validateFixtures } = require('./validate');
const { getSeedConfig } = require('./config');
const { writeLoginDetails } = require('./login-details');

const topLevelWrites = (db, collection, records, idField) =>
  records.map((data) => ({
    ref: db.collection(collection).doc(data[idField]),
    data,
  }));

async function runSeed() {
  const config = getSeedConfig();
  if (!config.enabled) {
    throw new Error(
      'Firestore seed writes are disabled. Set SEED_ENABLED=true in Backend/.env after verifying the Firebase project.',
    );
  }
  const fixtures = await buildSchemaV2Fixtures();
  const counts = validateFixtures(fixtures);
  if (counts.totalDocuments > config.maxWrites) {
    throw new Error(
      `Seed would write ${counts.totalDocuments} documents, exceeding SEED_MAX_WRITES=${config.maxWrites}. Reduce the record counts or explicitly raise the guard after checking the Firebase quota.`,
    );
  }
  writeLoginDetails(fixtures, config);
  console.log(
    `Validated ${counts.totalDocuments} documents. Writing batches of at most ${config.writeBatchSize} with ${config.writeDelayMs}ms between batches.`,
  );

  const writeOptions = {
    batchSize: config.writeBatchSize,
    delayMs: config.writeDelayMs,
  };
  const db = getDb();

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
      writeOptions,
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
    writeOptions,
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
    writeOptions,
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
    writeOptions,
  );

  console.log('Database seed complete. Validation counts:');
  console.log(JSON.stringify(counts, null, 2));
}

if (require.main === module) {
  runSeed().catch((error) => {
    console.error('Database seed failed.');
    console.error(error);
    process.exitCode = 1;
  });
}

module.exports = { runSeed };
