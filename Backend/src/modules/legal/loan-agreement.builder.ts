import { createHash } from 'crypto';
import type { Timestamp } from 'firebase-admin/firestore';

import type { UserRole } from '../auth/auth.types';
import type {
  LoanAgreementDocument,
  LoanAgreementParty,
  LoanAgreementTerms,
} from './legal.types';

export const LOAN_AGREEMENT_CONSENT_TEXT_VERSION =
  'loan_agreement_consent_v1' as const;

export function loanAgreementIdFor(loanId: string, version = 1): string {
  return `agreement_${loanId}_v${String(version).padStart(3, '0')}`;
}

export function agreementAcceptanceIdFor(
  agreementId: string,
  role: 'borrower' | 'lender',
): string {
  return `${agreementId}_${role}`;
}

export function disbursementTransactionIdFor(loanId: string): string {
  return `disbursement_${loanId}`;
}

export function buildLoanAgreement(input: {
  agreementId: string;
  loanId: string;
  applicationId: string;
  listingId: string;
  version: number;
  borrower: LoanAgreementParty;
  lender: LoanAgreementParty;
  terms: LoanAgreementTerms;
  generatedByUserId: string;
  generatedByRole: UserRole | 'system';
  now: Timestamp;
}): LoanAgreementDocument {
  const termsHash = computeAgreementTermsHash({
    loanId: input.loanId,
    applicationId: input.applicationId,
    listingId: input.listingId,
    version: input.version,
    borrowerId: input.borrower.userId,
    lenderId: input.lender.userId,
    terms: input.terms,
  });

  const agreement: LoanAgreementDocument = {
    agreementId: input.agreementId,
    loanId: input.loanId,
    applicationId: input.applicationId,
    listingId: input.listingId,
    version: input.version,
    status: 'awaiting_signatures',
    title: `Smart Credit Loan Agreement - ${input.loanId}`,
    summary: `${input.borrower.fullName} will borrow ${formatCurrencyMinor(
      input.terms.principalMinor,
    )} from ${input.lender.fullName} for ${input.terms.tenureMonths} months at ${
      input.terms.annualInterestRate
    }% annual interest.`,
    borrowerId: input.borrower.userId,
    lenderId: input.lender.userId,
    borrower: input.borrower,
    lender: input.lender,
    terms: input.terms,
    bodyHtml: '',
    termsHash,
    consentTextVersion: LOAN_AGREEMENT_CONSENT_TEXT_VERSION,
    borrowerAcceptance: emptyAcceptance(),
    lenderAcceptance: emptyAcceptance(),
    disbursementConfirmation: emptyDisbursementConfirmation(),
    generatedByUserId: input.generatedByUserId,
    generatedByRole: input.generatedByRole,
    generatedAt: input.now,
    updatedAt: input.now,
    finalizedAt: null,
    finalizationStartedAt: null,
    finalizationError: null,
    signedPdfDocumentId: null,
    signedPdfGeneratedAt: null,
    pdfSha256Hash: null,
  };

  agreement.bodyHtml = buildAgreementHtml(agreement);
  return agreement;
}

export function buildAgreementHtml(agreement: LoanAgreementDocument): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>${escapeHtml(agreement.title)}</title>
  <style>
    body { font-family: Arial, sans-serif; color: #172033; margin: 40px; line-height: 1.55; }
    h1, h2 { color: #0b1f3a; }
    .muted { color: #5f6b7a; }
    .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
    .card { border: 1px solid #d9e1ec; border-radius: 10px; padding: 16px; margin-bottom: 18px; }
    table { width: 100%; border-collapse: collapse; margin: 12px 0 20px; }
    th, td { border: 1px solid #d9e1ec; padding: 10px; text-align: left; }
    th { background: #f3f6fa; }
    .signatures { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; margin-top: 42px; }
    .signature { border-top: 1px solid #6b7280; padding-top: 10px; }
    .hash { font-family: monospace; font-size: 9px; overflow-wrap: anywhere; }
  </style>
</head>
<body>
  <h1>Smart Credit Loan Agreement</h1>
  <p class="muted">Agreement ${escapeHtml(agreement.agreementId)} · Version ${agreement.version}</p>

  <h2>Parties</h2>
  <div class="grid">
    <div class="card"><strong>Borrower</strong><br />${partyHtml(agreement.borrower)}</div>
    <div class="card"><strong>Lender</strong><br />${partyHtml(agreement.lender)}</div>
  </div>

  <h2>Financial terms</h2>
  <table>
    <tr><th>Principal</th><td>${escapeHtml(formatCurrencyMinor(agreement.terms.principalMinor))}</td></tr>
    <tr><th>Annual interest rate</th><td>${agreement.terms.annualInterestRate}%</td></tr>
    <tr><th>Total interest</th><td>${escapeHtml(formatCurrencyMinor(agreement.terms.interestAmountMinor))}</td></tr>
    <tr><th>Total repayable</th><td>${escapeHtml(formatCurrencyMinor(agreement.terms.totalRepayableMinor))}</td></tr>
    <tr><th>Monthly installment</th><td>${escapeHtml(formatCurrencyMinor(agreement.terms.monthlyInstallmentMinor))}</td></tr>
    <tr><th>Tenure</th><td>${agreement.terms.tenureMonths} months</td></tr>
    <tr><th>First payment</th><td>One calendar month after activation</td></tr>
  </table>

  <h2>Core conditions</h2>
  <ol>
    <li>The lender handles the external principal transfer after signing and before the borrower signs.</li>
    <li>The borrower agrees to repay the total amount in monthly installments shown above.</li>
    <li>The lender signs first. The borrower signs after the external transfer step, which Smart Credit does not execute or independently verify.</li>
    <li>The borrower signature following the lender signature activates the loan and records disbursement bookkeeping.</li>
    <li>Any change to the financial terms requires a new agreement version and new signatures.</li>
    <li>Smart Credit records agreement consent, timestamps and integrity hashes for audit purposes.</li>
    <li>Disputes are handled through the Smart Credit dispute workflow. This template requires legal review before production use.</li>
  </ol>

  <div class="card"><strong>External transfer confirmation</strong><br />${disbursementHtml(
    agreement,
  )}</div>

  <div class="signatures">
    ${signatureBlock(agreement.borrowerAcceptance, 'Borrower')}
    ${signatureBlock(agreement.lenderAcceptance, 'Lender')}
  </div>

  <p class="hash"><strong>Terms SHA-256:</strong> ${escapeHtml(agreement.termsHash)}</p>
</body>
</html>`;
}

export function computeAgreementTermsHash(value: unknown): string {
  return createHash('sha256').update(stableStringify(value)).digest('hex');
}

export function formatCurrencyMinor(value: number): string {
  return new Intl.NumberFormat('en-LK', {
    style: 'currency',
    currency: 'LKR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value / 100);
}

function emptyAcceptance() {
  return { accepted: false, signedName: null, acceptedAt: null };
}

function emptyDisbursementConfirmation() {
  return {
    confirmed: false,
    confirmedByLenderId: null,
    confirmedAt: null,
    principalMinor: null,
    externalReference: null,
    ipAddressHash: null,
    userAgent: null,
  };
}

function disbursementHtml(agreement: LoanAgreementDocument): string {
  const confirmation = agreement.disbursementConfirmation;
  if (!confirmation?.confirmed) return 'Pending lender confirmation';
  return `Confirmed at: ${escapeHtml(
    confirmation.confirmedAt?.toDate().toISOString() ?? 'Unknown',
  )}<br />Amount: ${escapeHtml(
    formatCurrencyMinor(confirmation.principalMinor ?? agreement.terms.principalMinor),
  )}<br />External reference: ${escapeHtml(
    confirmation.externalReference ?? 'Not provided',
  )}`;
}

function partyHtml(party: LoanAgreementParty): string {
  return `${escapeHtml(party.fullName)}<br />${escapeHtml(
    party.email,
  )}<br />${escapeHtml(party.phone)}`;
}

function signatureBlock(
  acceptance: LoanAgreementDocument['borrowerAcceptance'],
  label: string,
): string {
  const signedAt = acceptance.acceptedAt
    ? acceptance.acceptedAt.toDate().toISOString()
    : 'Pending';
  return `<div class="signature"><strong>${escapeHtml(label)}</strong><br />Signed name: ${escapeHtml(
    acceptance.signedName ?? 'Pending',
  )}<br />Accepted at: ${escapeHtml(signedAt)}</div>`;
}

function stableStringify(value: unknown): string {
  if (Array.isArray(value)) {
    return `[${value.map(stableStringify).join(',')}]`;
  }
  if (value && typeof value === 'object') {
    const record = value as Record<string, unknown>;
    return `{${Object.keys(record)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${stableStringify(record[key])}`)
      .join(',')}}`;
  }
  return JSON.stringify(value);
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
