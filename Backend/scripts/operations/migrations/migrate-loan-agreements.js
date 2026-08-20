'use strict';

const crypto = require('crypto');
const { getDb } = require('../../shared/firebase');

const apply = process.argv.includes('--apply');

function number(value, fallback = 0) {
  return Number.isFinite(value) ? Number(value) : fallback;
}

function integer(value, fallback = 0) {
  return Number.isSafeInteger(value) ? Number(value) : fallback;
}

function stableStringify(value) {
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(',')}]`;
  if (value && typeof value === 'object') {
    return `{${Object.keys(value)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${stableStringify(value[key])}`)
      .join(',')}}`;
  }
  return JSON.stringify(value);
}

function timestampValue(value, fallback = null) {
  if (value?.toDate instanceof Function || value instanceof Date) return value;
  if (typeof value === 'string' || typeof value === 'number') {
    const parsed = new Date(value);
    if (!Number.isNaN(parsed.getTime())) return parsed;
  }
  return fallback;
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function freshAgreementHtml({ agreementId, version, borrower, lender, terms, termsHash }) {
  return `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><title>Smart Credit Loan Agreement</title></head><body><h1>Smart Credit Loan Agreement</h1><p>${escapeHtml(agreementId)} · Version ${version}</p><h2>Parties</h2><p>Borrower: ${escapeHtml(borrower.fullName)}</p><p>Lender: ${escapeHtml(lender.fullName)}</p><h2>Financial terms</h2><p>Principal minor units: ${terms.principalMinor}</p><p>Annual interest: ${terms.annualInterestRate}%</p><p>Total repayable minor units: ${terms.totalRepayableMinor}</p><p>Monthly installment minor units: ${terms.monthlyInstallmentMinor}</p><p>Tenure: ${terms.tenureMonths} months</p><p>First payment is due one calendar month after activation.</p><p>Both signatures are pending.</p><p>Terms SHA-256: ${escapeHtml(termsHash)}</p></body></html>`;
}

function party(value, fallbackUser, role) {
  const data = value && typeof value === 'object' ? value : {};
  return {
    userId: data.userId || fallbackUser.userId || '',
    fullName: data.fullName || fallbackUser.fullName || 'Unknown',
    email: data.email || fallbackUser.email || '',
    phone: data.phone || fallbackUser.phone || '',
    role,
  };
}

function acceptance(legacy, role) {
  const accepted = Boolean(legacy[`${role}Accepted`]);
  const audit = legacy[`${role}SignatureAudit`] || {};
  return {
    accepted,
    signedName: accepted ? audit.signedName || 'Legacy signer' : null,
    acceptedAt: accepted
      ? timestampValue(legacy[`${role}AcceptedAt`], null)
      : null,
  };
}

function normalizedTerms(loan, legacy) {
  const snapshot = legacy.loanSnapshot || {};
  const principalMinor = integer(
    loan.principalMinor,
    Math.round(number(snapshot.amount ?? loan.amount ?? loan.principalAmount) * 100),
  );
  const annualInterestRate = number(
    loan.annualInterestRate ?? snapshot.interestRate ?? loan.interestRate,
  );
  const tenureMonths = integer(
    loan.tenureMonths ?? snapshot.durationMonths ?? loan.durationMonths,
  );
  const interestAmountMinor = integer(
    loan.interestAmountMinor,
    Math.round(principalMinor * (annualInterestRate / 100) * (tenureMonths / 12)),
  );
  const totalRepayableMinor = integer(
    loan.totalRepayableMinor,
    principalMinor + interestAmountMinor,
  );
  return {
    currency: 'LKR',
    principalMinor,
    annualInterestRate,
    interestAmountMinor,
    totalRepayableMinor,
    monthlyInstallmentMinor: integer(
      loan.monthlyInstallmentMinor,
      tenureMonths ? Math.floor(totalRepayableMinor / tenureMonths) : 0,
    ),
    tenureMonths,
    repaymentFrequency: 'monthly',
    repaymentStartRule: 'one_month_after_activation',
  };
}

async function migrate() {
  if (apply && process.env.MIGRATION_ENABLED !== 'true') {
    throw new Error(
      'Set MIGRATION_ENABLED=true only after reviewing the dry-run output.',
    );
  }
  const db = getDb();
  const snapshot = await db
    .collection('legalDocuments')
    .where('documentType', '==', 'loan_agreement')
    .get();
  const writes = [];

  for (const source of snapshot.docs) {
    const legacy = source.data();
    const loanId = legacy.loanId;
    if (!loanId) continue;
    const loanSnapshot = await db.collection('loans').doc(loanId).get();
    if (!loanSnapshot.exists) continue;
    const loan = loanSnapshot.data() || {};
    const [borrowerSnapshot, lenderSnapshot] = await Promise.all([
      db.collection('users').doc(loan.borrowerId || legacy.borrower?.userId).get(),
      db.collection('users').doc(loan.lenderId || legacy.lender?.userId).get(),
    ]);
    const borrower = party(
      legacy.borrower,
      { userId: borrowerSnapshot.id, ...(borrowerSnapshot.data() || {}) },
      'borrower',
    );
    const lender = party(
      legacy.lender,
      { userId: lenderSnapshot.id, ...(lenderSnapshot.data() || {}) },
      'lender',
    );
    const terms = normalizedTerms(loan, legacy);
    const termsHash = crypto
      .createHash('sha256')
      .update(
        stableStringify({
          applicationId: loan.applicationId || '',
          borrowerId: borrower.userId,
          lenderId: lender.userId,
          listingId: loan.listingId || loan.adId || '',
          loanId,
          terms,
          version: 1,
        }),
      )
      .digest('hex');
    const fullyAccepted =
      Boolean(legacy.borrowerAccepted) && Boolean(legacy.lenderAccepted);
    const legacyId = `legacy_${source.id}`;
    const now = new Date();
    const base = {
      agreementId: legacyId,
      loanId,
      applicationId: loan.applicationId || '',
      listingId: loan.listingId || loan.adId || '',
      version: 1,
      status: fullyAccepted ? 'fully_accepted' : 'superseded',
      title: legacy.title || `Smart Credit Loan Agreement - ${loanId}`,
      summary: legacy.summary || 'Migrated legacy loan agreement.',
      borrowerId: borrower.userId,
      lenderId: lender.userId,
      borrower,
      lender,
      terms,
      bodyHtml: legacy.htmlContent || '<h1>Migrated loan agreement</h1>',
      termsHash,
      consentTextVersion: 'loan_agreement_consent_v1',
      borrowerAcceptance: acceptance(legacy, 'borrower'),
      lenderAcceptance: acceptance(legacy, 'lender'),
      generatedByUserId: legacy.generatedByUserId || lender.userId,
      generatedByRole: legacy.generatedByRole || 'lender',
      generatedAt: timestampValue(legacy.generatedAt, now),
      updatedAt: timestampValue(legacy.updatedAt, now),
      finalizedAt: fullyAccepted
        ? timestampValue(
            legacy.signedPdfGeneratedAt || legacy.updatedAt,
            now,
          )
        : null,
      finalizationStartedAt: null,
      finalizationError: null,
      signedPdfDocumentId: legacy.signedPdfDocumentId || null,
      signedPdfGeneratedAt: timestampValue(legacy.signedPdfGeneratedAt, null),
      pdfSha256Hash: legacy.pdfSha256Hash || null,
      migratedFromLegalDocumentId: source.id,
      legacyReadOnly: true,
    };
    writes.push({ ref: db.collection('loanAgreements').doc(legacyId), data: base });

    if (!fullyAccepted) {
      const existingAgreements = await db
        .collection('loanAgreements')
        .where('loanId', '==', loanId)
        .get();
      const existingWritable = existingAgreements.docs.find(
        (document) => !document.data().legacyReadOnly,
      );
      if (existingWritable) continue;
      const version = Math.max(
        1,
        ...existingAgreements.docs.map((document) =>
          integer(document.data().version, 0),
        ),
      );
      const freshId = `agreement_${loanId}_v${String(version).padStart(3, '0')}`;
      const freshTermsHash = crypto
        .createHash('sha256')
        .update(
          stableStringify({
            applicationId: loan.applicationId || '',
            borrowerId: borrower.userId,
            lenderId: lender.userId,
            listingId: loan.listingId || loan.adId || '',
            loanId,
            terms,
            version,
          }),
        )
        .digest('hex');
      writes.push({
        ref: db.collection('loanAgreements').doc(freshId),
        data: {
          ...base,
          agreementId: freshId,
          version,
          status: 'awaiting_signatures',
          bodyHtml: freshAgreementHtml({
            agreementId: freshId,
            version,
            borrower,
            lender,
            terms,
            termsHash: freshTermsHash,
          }),
          termsHash: freshTermsHash,
          borrowerAcceptance: { accepted: false, signedName: null, acceptedAt: null },
          lenderAcceptance: { accepted: false, signedName: null, acceptedAt: null },
          generatedAt: now,
          updatedAt: now,
          finalizedAt: null,
          signedPdfDocumentId: null,
          signedPdfGeneratedAt: null,
          pdfSha256Hash: null,
          legacyReadOnly: false,
        },
      });
      writes.push({
        ref: db.collection('loans').doc(loanId),
        data: {
          currentAgreementId: freshId,
          agreementStatus: 'awaiting_signatures',
          termsVersion: version,
          updatedAt: now,
        },
      });
    }
  }

  console.log(
    `${apply ? 'Applying' : 'Dry run:'} ${writes.length} agreement writes from ${snapshot.size} legacy records.`,
  );
  if (!apply || writes.length === 0) return;
  for (let offset = 0; offset < writes.length; offset += 400) {
    const batch = db.batch();
    for (const write of writes.slice(offset, offset + 400)) {
      batch.set(write.ref, write.data, { merge: true });
    }
    await batch.commit();
  }
  console.log('Loan-agreement migration completed without deleting source records.');
}

if (require.main === module) {
  migrate().catch((error) => {
    console.error('Loan-agreement migration failed.');
    console.error(error);
    process.exitCode = 1;
  });
}

module.exports = { migrate };
