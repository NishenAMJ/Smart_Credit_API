const { config } = require('dotenv');
const { initializeApp, applicationDefault, getApps, cert } = require('firebase-admin/app');
const { getFirestore, Timestamp } = require('firebase-admin/firestore');
const path = require('path');

config({ path: path.resolve(__dirname, '..', '.env') });

function parseServiceAccountFromEnv() {
  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_PRIVATE_KEY
    ? process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n')
    : null;

  if (!projectId || !clientEmail || !privateKey) {
    return null;
  }

  return {
    projectId,
    clientEmail,
    privateKey,
  };
}

if (getApps().length === 0) {
  const serviceAccount = parseServiceAccountFromEnv();
  initializeApp({
    credential: serviceAccount ? cert(serviceAccount) : applicationDefault(),
  });
}

const db = getFirestore();
const BATCH_LIMIT = 400;

function readNumber(...values) {
  for (const value of values) {
    if (typeof value === 'number' && Number.isFinite(value)) {
      return value;
    }

    if (typeof value === 'string' && value.trim().length > 0) {
      const parsed = Number(value);

      if (Number.isFinite(parsed)) {
        return parsed;
      }
    }
  }

  return 0;
}

function readDate(...values) {
  for (const value of values) {
    if (value instanceof Timestamp) {
      return value.toDate();
    }

    if (value instanceof Date) {
      return value;
    }

    if (typeof value === 'string' && value.trim().length > 0) {
      const parsed = new Date(value);

      if (!Number.isNaN(parsed.getTime())) {
        return parsed;
      }
    }
  }

  return null;
}

function readString(...values) {
  for (const value of values) {
    if (typeof value === 'string' && value.trim().length > 0) {
      return value;
    }
  }

  return null;
}

function getLoanAmount(data) {
  return readNumber(data.amount, data.principalAmount);
}

function getLoanCreatedAt(data) {
  return readDate(data.createdAt, data.startDate, data.signedAt, data.updatedAt);
}

function getInstallmentAmount(data) {
  return readNumber(data.amount, data.amountDue, data.originalAmount, data.dueAmount);
}

function getInstallmentPaidAmount(data) {
  return readNumber(data.paidAmount, data.amountPaid);
}

function getProfileName(data, fallback) {
  return (
    readString(data.businessName, data.fullName, data.displayName, data.email) ??
    fallback
  );
}

function normalizeSearchValue(value) {
  return value.trim().toLowerCase().replace(/[^a-z0-9@._-]+/g, ' ');
}

function buildSearchKeywords(...values) {
  const keywords = new Set();

  values.forEach((value) => {
    if (typeof value !== 'string' || value.trim().length === 0) {
      return;
    }

    const normalized = normalizeSearchValue(value);

    if (!normalized) {
      return;
    }

    normalized
      .split(/\s+/)
      .filter((token) => token.length >= 2)
      .forEach((token) => {
        for (let index = 2; index <= token.length; index += 1) {
          keywords.add(token.slice(0, index));
        }
      });
  });

  return Array.from(keywords);
}

async function main() {
  const [usersSnapshot, loansSnapshot] = await Promise.all([
    db.collection('users').get(),
    db.collection('loans').get(),
  ]);
  const userMeta = new Map();
  const loanMeta = new Map();
  const relationMeta = new Map();

  usersSnapshot.docs.forEach((doc) => {
    userMeta.set(doc.id, doc.data());
  });

  loansSnapshot.docs.forEach((doc) => {
    const data = doc.data();
    loanMeta.set(doc.id, {
      lenderId: typeof data.lenderId === 'string' ? data.lenderId : null,
      borrowerId: typeof data.borrowerId === 'string' ? data.borrowerId : null,
      amount: getLoanAmount(data),
      status: typeof data.status === 'string' ? data.status : 'unknown',
      createdAt: getLoanCreatedAt(data),
      totalRepayable: readNumber(data.totalRepayable, data.amount, data.principalAmount),
    });
  });

  let batch = db.batch();
  let batchWrites = 0;
  let committedBatches = 0;
  const counts = {
    lenderBorrowers: 0,
    loans: 0,
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

  async function queueSet(ref, payload) {
    batch.set(ref, payload, { merge: true });
    batchWrites += 1;

    if (batchWrites >= BATCH_LIMIT) {
      await commitBatch();
    }
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

    if (!meta?.lenderId || !meta.borrowerId) {
      continue;
    }

    const installmentsSnapshot = await loanDoc.ref.collection('installments').get();
    let totalPaidAmount = 0;

    for (const installmentDoc of installmentsSnapshot.docs) {
      const installmentData = installmentDoc.data();
      const installmentAmount = getInstallmentAmount(installmentData);
      const paidAmount = getInstallmentPaidAmount(installmentData);
      totalPaidAmount += Math.min(installmentAmount, paidAmount);

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

    const remainingAmount = Math.max(0, meta.totalRepayable - totalPaidAmount);
    await queueSet(loanDoc.ref, {
      remainingAmount,
    });
    counts.loans += 1;

    const lenderProfile = userMeta.get(meta.lenderId) ?? {};
    const borrowerProfile = userMeta.get(meta.borrowerId) ?? {};
    const relationKey = `${meta.lenderId}__${meta.borrowerId}`;
    const existingRelation = relationMeta.get(relationKey) ?? {
      lenderId: meta.lenderId,
      borrowerId: meta.borrowerId,
      lenderName: getProfileName(lenderProfile, meta.lenderId),
      borrowerName: getProfileName(borrowerProfile, meta.borrowerId),
      borrowerCreditScore: readNumber(borrowerProfile.creditScore),
      borrowerKycStatus: readString(borrowerProfile.kycStatus) ?? 'not_submitted',
      totalLoans: 0,
      activeLoanCount: 0,
      completedLoanCount: 0,
      totalPrincipalAmount: 0,
      outstandingAmount: 0,
      latestLoanStatus: 'unknown',
      latestLoanCreatedAt: null,
      createdAt: meta.createdAt ?? new Date(),
      updatedAt: new Date(),
    };

    existingRelation.totalLoans += 1;
    existingRelation.totalPrincipalAmount += meta.amount;
    existingRelation.outstandingAmount += remainingAmount;

    if (meta.status === 'active') {
      existingRelation.activeLoanCount += 1;
    }

    if (['completed', 'closed', 'paid'].includes(meta.status)) {
      existingRelation.completedLoanCount += 1;
    }

    const latestTime = existingRelation.latestLoanCreatedAt
      ? existingRelation.latestLoanCreatedAt.getTime()
      : 0;
    const candidateTime = meta.createdAt ? meta.createdAt.getTime() : 0;

    if (candidateTime >= latestTime) {
      existingRelation.latestLoanCreatedAt = meta.createdAt;
      existingRelation.latestLoanStatus = meta.status;
    }

    relationMeta.set(relationKey, existingRelation);
  }

  for (const [relationKey, relation] of relationMeta.entries()) {
    const borrowerProfile = userMeta.get(relation.borrowerId) ?? {};
    const relationRef = db.collection('lenderBorrowers').doc(relationKey);
    await queueSet(relationRef, {
      lenderId: relation.lenderId,
      borrowerId: relation.borrowerId,
      lenderName: relation.lenderName,
      borrowerName: relation.borrowerName,
      searchKeywords: buildSearchKeywords(
        relation.borrowerName,
        borrowerProfile?.email ?? null,
        relation.borrowerId,
      ),
      borrowerCreditScore: relation.borrowerCreditScore,
      borrowerKycStatus: relation.borrowerKycStatus,
      totalLoans: relation.totalLoans,
      loanCount: relation.totalLoans,
      activeLoanCount: relation.activeLoanCount,
      activeLoansCount: relation.activeLoanCount,
      completedLoanCount: relation.completedLoanCount,
      totalPrincipalAmount: relation.totalPrincipalAmount,
      totalBorrowedAmount: relation.totalPrincipalAmount,
      outstandingAmount: relation.outstandingAmount,
      latestLoanStatus: relation.latestLoanStatus,
      latestLoanCreatedAt: relation.latestLoanCreatedAt ?? null,
      createdAt: relation.createdAt,
      updatedAt: new Date(),
    });
    counts.lenderBorrowers += 1;
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
