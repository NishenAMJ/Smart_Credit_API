import { Timestamp } from 'firebase-admin/firestore';

import {
  buildLoanAgreement,
  computeAgreementTermsHash,
  formatCurrencyMinor,
} from './loan-agreement.builder';

describe('loan agreement builder', () => {
  it('produces stable hashes independent of object key order', () => {
    expect(computeAgreementTermsHash({ a: 1, b: 2 })).toBe(
      computeAgreementTermsHash({ b: 2, a: 1 }),
    );
  });

  it('formats integer minor units as LKR without changing their value', () => {
    expect(formatCurrencyMinor(123_456)).toContain('1,234.56');
  });

  it('escapes participant text in the immutable HTML body', () => {
    const agreement = buildLoanAgreement({
      agreementId: 'agreement_loan-1_v001',
      loanId: 'loan-1',
      applicationId: 'application-1',
      listingId: 'listing-1',
      version: 1,
      borrower: {
        userId: 'borrower-1',
        fullName: '<script>alert(1)</script>',
        email: 'borrower@example.com',
        phone: '+94770000001',
        role: 'borrower',
      },
      lender: {
        userId: 'lender-1',
        fullName: 'Lender & Company',
        email: 'lender@example.com',
        phone: '+94770000002',
        role: 'lender',
      },
      terms: {
        currency: 'LKR',
        principalMinor: 1_000_000,
        annualInterestRate: 12,
        interestAmountMinor: 120_000,
        totalRepayableMinor: 1_120_000,
        monthlyInstallmentMinor: 93_333,
        tenureMonths: 12,
        repaymentFrequency: 'monthly',
        repaymentStartRule: 'one_month_after_activation',
      },
      generatedByUserId: 'lender-1',
      generatedByRole: 'lender',
      now: Timestamp.now(),
    });

    expect(agreement.bodyHtml).toContain('&lt;script&gt;alert(1)&lt;/script&gt;');
    expect(agreement.bodyHtml).not.toContain('<script>alert(1)</script>');
    expect(agreement.bodyHtml).toContain('Lender &amp; Company');
  });
});
