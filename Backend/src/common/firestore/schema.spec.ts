import {
  COLLECTIONS,
  installmentIdFor,
  repaymentTransactionIdFor,
} from './schema';

describe('canonical Firestore schema', () => {
  it('uses deterministic installment and repayment identifiers', () => {
    expect(installmentIdFor(1)).toBe('month_001');
    expect(installmentIdFor(12)).toBe('month_012');
    expect(repaymentTransactionIdFor('loan_1', 'month_001')).toBe(
      'repayment_loan_1_month_001',
    );
  });

  it('does not expose removed duplicate collections', () => {
    const names = Object.values(COLLECTIONS);
    expect(names).not.toContain('ads');
    expect(names).not.toContain('loanRequests');
    expect(names).not.toContain('lenderBorrowers');
    expect(names).not.toContain('payments');
  });
});
