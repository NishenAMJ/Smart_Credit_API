import {
  getAdStatus,
  getInstallmentAmount,
  getNormalizedInstallment,
  getPaymentAmount,
  getPaymentCreatedAt,
  isActiveAd,
} from './firestore-seed.utils';

describe('firestore-seed utils', () => {
  it('maps legacy approved ads into active status', () => {
    expect(getAdStatus({ status: 'approved' } as never)).toBe('active');
    expect(isActiveAd({ status: 'approved', expiresAt: '2099-01-01T00:00:00.000Z' } as never)).toBe(true);
  });

  it('reads aliased installment and payment amounts', () => {
    expect(getInstallmentAmount({ amountDue: 12000 } as never)).toBe(12000);
    expect(getInstallmentAmount({ originalAmount: 18000 } as never)).toBe(18000);
    expect(getPaymentAmount({ paidAmount: 4500 } as never)).toBe(4500);
  });

  it('normalizes seeded installments into the API shape', () => {
    expect(
      getNormalizedInstallment({
        status: 'partial',
        dueDate: '2026-04-21T00:00:00.000Z',
        amountDue: 10000,
        paidAmount: 3000,
      } as never),
    ).toMatchObject({
      status: 'partially_paid',
      amount: 10000,
      paidAmount: 3000,
    });
  });

  it('supports seed2 payment and installment aliases', () => {
    expect(
      getPaymentCreatedAt({ paidDate: '2026-04-21T12:00:00.000Z' } as never)?.toISOString(),
    ).toBe('2026-04-21T12:00:00.000Z');

    expect(
      getNormalizedInstallment({
        status: 'pending',
        dueDateAt: '2026-04-21T00:00:00.000Z',
        originalAmount: 9000,
        amountPaid: 4000,
        installmentNo: 2,
      } as never),
    ).toMatchObject({
      amount: 9000,
      paidAmount: 4000,
      installmentNumber: 2,
    });
  });
});
