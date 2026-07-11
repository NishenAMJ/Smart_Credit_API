'use strict';

function pad(value, length) {
  return String(value).padStart(length, '0');
}

async function commitSetWrites(db, writes, label) {
  if (!writes.length) {
    console.log(`No ${label} writes to apply.`);
    return;
  }

  const MAX_BATCH_SIZE = 400;
  let batch = db.batch();
  let count = 0;
  let batchNumber = 0;

  for (let index = 0; index < writes.length; index += 1) {
    const write = writes[index];
    batch.set(write.ref, write.data, { merge: true });
    count += 1;

    if (count === MAX_BATCH_SIZE || index === writes.length - 1) {
      batchNumber += 1;
      await batch.commit();
      console.log(
        `Committed ${label} batch ${pad(batchNumber, 2)} with ${count} writes.`,
      );
      batch = db.batch();
      count = 0;
    }
  }
}

async function assertTopLevelDocsExist(db, collectionName, ids, dependencyLabel) {
  const snapshots = await Promise.all(
    ids.map((id) => db.collection(collectionName).doc(id).get()),
  );

  const missing = snapshots
    .filter((snapshot) => !snapshot.exists)
    .map((snapshot) => snapshot.id);

  if (missing.length > 0) {
    throw new Error(
      `${dependencyLabel} is missing required ${collectionName} documents: ${missing.join(', ')}`,
    );
  }
}

async function assertInstallmentDocsExist(db, installmentSpecs) {
  const snapshots = await Promise.all(
    installmentSpecs.map((spec) =>
      db
        .collection('loans')
        .doc(spec.loanId)
        .collection('installments')
        .doc(spec.installmentId)
        .get(),
    ),
  );

  const missing = snapshots
    .filter((snapshot) => !snapshot.exists)
    .map((snapshot) => `${snapshot.ref.parent.parent.id}/${snapshot.id}`);

  if (missing.length > 0) {
    throw new Error(
      `Installment payment seed is missing required installment documents: ${missing.join(', ')}`,
    );
  }
}

module.exports = {
  assertInstallmentDocsExist,
  assertTopLevelDocsExist,
  commitSetWrites,
  pad,
};
