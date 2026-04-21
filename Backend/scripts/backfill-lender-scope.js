const { initializeApp, applicationDefault, getApps } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');

if (getApps().length === 0) {
  initializeApp({
    credential: applicationDefault(),
  });
}

const db = getFirestore();
const BATCH_LIMIT = 400;

async function main() {
  const loansSnapshot = await db.collection('loans').get();
  const loanMeta = new Map();

  loansSnapshot.docs.forEach((doc) => {
    const data = doc.data();
    loanMeta.set(doc.id, {
      lenderId: typeof data.lenderId === 'string' ? data.lenderId : null,
      borrowerId: typeof data.borrowerId === 'string' ? data.borrowerId : null,
    });
  });

  let batch = db.batch();
  let batchWrites = 0;
  let committedBatches = 0;
  const counts = {
    transactions: 0,
    disputes: 0,
    installments: 0,
    payments: 0,
  };

  async function commitBatch() {
    if (batchWrites === 0) {
      return;
    }

    await batch.commit();
    batch = db.batch();
    batchWrites = 0;
    committedBatches += 1;
  }

  function queueSet(ref, payload) {
    batch.set(ref, payload, { merge: true });
    batchWrites += 1;

    if (batchWrites >= BATCH_LIMIT) {
      return commitBatch();
    }

    return Promise.resolve();
  }

  const transactionsSnapshot = await db.collection('transactions').get();
  for (const doc of transactionsSnapshot.docs) {
    const data = doc.data();
    const loanId = typeof data.loanId === 'string' ? data.loanId : null;
    const meta = loanId ? loanMeta.get(loanId) : null;

    if (!meta?.lenderId) {
      continue;
    }

    await queueSet(doc.ref, {
      lenderId: meta.lenderId,
      borrowerId: meta.borrowerId,
    });
    counts.transactions += 1;
  }

  const disputesSnapshot = await db.collection('disputes').get();
  for (const doc of disputesSnapshot.docs) {
    const data = doc.data();
    const loanId = typeof data.loanId === 'string' ? data.loanId : null;
    const meta = loanId ? loanMeta.get(loanId) : null;

    if (!meta?.lenderId) {
      continue;
    }

    await queueSet(doc.ref, {
      lenderId: meta.lenderId,
      borrowerId: meta.borrowerId,
    });
    counts.disputes += 1;
  }

  for (const loanDoc of loansSnapshot.docs) {
    const meta = loanMeta.get(loanDoc.id);

    if (!meta?.lenderId) {
      continue;
    }

    const installmentsSnapshot = await loanDoc.ref.collection('installments').get();

    for (const installmentDoc of installmentsSnapshot.docs) {
      await queueSet(installmentDoc.ref, {
        loanId: loanDoc.id,
        lenderId: meta.lenderId,
        borrowerId: meta.borrowerId,
      });
      counts.installments += 1;

      const paymentsSnapshot = await installmentDoc.ref.collection('payments').get();

      for (const paymentDoc of paymentsSnapshot.docs) {
        await queueSet(paymentDoc.ref, {
          loanId: loanDoc.id,
          installmentId: installmentDoc.id,
          lenderId: meta.lenderId,
          borrowerId: meta.borrowerId,
          paymentId: paymentDoc.id,
        });
        counts.payments += 1;
      }
    }
  }

  await commitBatch();

  console.log('Lender scope backfill complete.');
  console.log(`Committed batches: ${committedBatches}`);
  console.log(JSON.stringify(counts, null, 2));
}

main().catch((error) => {
  console.error('Failed to backfill lender-scoped fields.');
  console.error(error);
  process.exitCode = 1;
});
