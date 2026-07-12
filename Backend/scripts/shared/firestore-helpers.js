'use strict';

function pad(value, length) {
  return String(value).padStart(length, '0');
}

async function commitSetWrites(db, writes, label) {
  if (!writes.length) {
    console.log(`No ${label} writes to apply.`);
    return;
  }

  const MAX_BATCH_SIZE = 300;
  const MAX_ATTEMPTS = 3;
  const COMMIT_TIMEOUT_MS = 45000;

  for (let offset = 0; offset < writes.length; offset += MAX_BATCH_SIZE) {
    const chunk = writes.slice(offset, offset + MAX_BATCH_SIZE);
    const batchNumber = Math.floor(offset / MAX_BATCH_SIZE) + 1;

    for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt += 1) {
      const batch = db.batch();
      chunk.forEach((write) =>
        batch.set(write.ref, write.data, { merge: true }),
      );

      let timeout;
      try {
        await Promise.race([
          batch.commit(),
          new Promise((_, reject) => {
            timeout = setTimeout(
              () =>
                reject(
                  new Error(
                    `Firestore commit timed out after ${COMMIT_TIMEOUT_MS}ms`,
                  ),
                ),
              COMMIT_TIMEOUT_MS,
            );
          }),
        ]);
        clearTimeout(timeout);
        console.log(
          `Committed ${label} batch ${pad(batchNumber, 2)} with ${chunk.length} writes.`,
        );
        break;
      } catch (error) {
        clearTimeout(timeout);
        if (attempt === MAX_ATTEMPTS) throw error;
        console.warn(
          `${label} batch ${pad(batchNumber, 2)} attempt ${attempt} failed; retrying.`,
        );
      }
    }
  }
}

async function assertTopLevelDocsExist(
  db,
  collectionName,
  ids,
  dependencyLabel,
) {
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
