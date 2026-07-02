import {
  decodeCursor,
  encodeCursor,
  getPaymentAncestorIds,
  hasRole,
  normalizeInstallmentStatus,
  readDate,
  readNumber,
  readStringArray,
} from './firestore-query.utils';

describe('firestore-query utils', () => {
  it('supports role values stored as a string or string array', () => {
    expect(hasRole('lender', 'lender')).toBe(true);
    expect(hasRole(['borrower', 'lender'], 'lender')).toBe(true);
    expect(hasRole(['borrower'], 'lender')).toBe(false);
  });

  it('parses cursors round-trip', () => {
    const date = new Date('2026-04-21T10:15:00.000Z');
    const cursor = encodeCursor(date, 'doc_123');

    expect(cursor).not.toBeNull();
    expect(decodeCursor(cursor)).toEqual({
      date,
      id: 'doc_123',
    });
  });

  it('extracts payment ancestors from a nested payment path', () => {
    expect(
      getPaymentAncestorIds(
        'loans/loan_1/installments/inst_2/payments/payment_3',
      ),
    ).toEqual({
      loanId: 'loan_1',
      installmentId: 'inst_2',
    });
  });

  it('normalizes installment statuses for seed data', () => {
    expect(
      normalizeInstallmentStatus(
        'partial',
        new Date('2026-05-01T00:00:00.000Z'),
        5000,
        10000,
      ),
    ).toBe('partially_paid');

    expect(
      normalizeInstallmentStatus(
        'pending',
        new Date('2020-01-01T00:00:00.000Z'),
        0,
        10000,
      ),
    ).toBe('overdue');
  });

  it('reads aliased scalar and date values safely', () => {
    expect(readNumber(undefined, '1500')).toBe(1500);
    expect(readStringArray(['a', 'b', 3, null])).toEqual(['a', 'b']);
    expect(readDate('2026-04-21T00:00:00.000Z')?.toISOString()).toBe(
      '2026-04-21T00:00:00.000Z',
    );
  });
});
