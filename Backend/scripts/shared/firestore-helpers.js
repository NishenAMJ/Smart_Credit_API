'use strict';

function pad(value, length) {
  return String(value).padStart(length, '0');
}

const sleep = (milliseconds) =>
  new Promise((resolve) => setTimeout(resolve, milliseconds));

function isRetryableFirestoreError(error) {
  if (error instanceof Error && error.message.includes('timed out')) {
    return true;
  }

  const retryableCodes = new Set([
    4,
    8,
    10,
    13,
    14,
    'deadline-exceeded',
    'resource-exhausted',
    'aborted',
    'internal',
    'unavailable',
  ]);
  return retryableCodes.has(error?.code);
}

async function commitSetWrites(db, writes, label, options = {}) {
  if (!writes.length) {
    console.log(`No ${label} writes to apply.`);
    return;
  }

  const maxBatchSize = options.batchSize ?? 200;
  const writeDelayMs = options.delayMs ?? 100;
  const MAX_ATTEMPTS = 3;

  for (let offset = 0; offset < writes.length; offset += maxBatchSize) {
    const chunk = writes.slice(offset, offset + maxBatchSize);
    const batchNumber = Math.floor(offset / maxBatchSize) + 1;

    for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt += 1) {
      const batch = db.batch();
      chunk.forEach((write) =>
        batch.set(write.ref, write.data, { merge: true }),
      );

      try {
        await batch.commit();
        console.log(
          `Committed ${label} batch ${pad(batchNumber, 2)} with ${chunk.length} writes.`,
        );
        break;
      } catch (error) {
        if (attempt === MAX_ATTEMPTS || !isRetryableFirestoreError(error)) {
          throw error;
        }
        const retryDelayMs = 1000 * 2 ** (attempt - 1);
        console.warn(
          `${label} batch ${pad(batchNumber, 2)} attempt ${attempt} failed; retrying in ${retryDelayMs}ms.`,
        );
        await sleep(retryDelayMs);
      }
    }

    if (offset + maxBatchSize < writes.length && writeDelayMs > 0) {
      await sleep(writeDelayMs);
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
