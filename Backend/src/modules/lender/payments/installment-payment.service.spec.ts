import { Timestamp } from 'firebase-admin/firestore';
import { InstallmentPaymentService } from './installment-payment.service';

describe('InstallmentPaymentService', () => {
  it('consumes a QR nonce in the ledger transaction and returns retries idempotently', async () => {
    const records = new Map<string, Record<string, any>>([
      [
        'loans/loan-1',
        {
          lenderId: 'lender-1',
          borrowerId: 'borrower-1',
          listingId: 'listing-1',
          status: 'active',
          amountPaidMinor: 0,
          remainingBalanceMinor: 450_000,
        },
      ],
      [
        'loans/loan-1/installments/month-1',
        {
          installmentId: 'month-1',
          status: 'due',
          amountDueMinor: 450_000,
          dueAt: Timestamp.now(),
        },
      ],
      [
        'qrNonces/nonce-1',
        {
          nonce: 'nonce-1',
          loanId: 'loan-1',
          borrowerId: 'borrower-1',
          amount: 4500,
          expiresAt: Date.now() + 60_000,
          used: false,
        },
      ],
    ]);
    const reference = (path: string): any => ({
      path,
      id: path.split('/').at(-1),
      collection: (name: string) => ({
        doc: (id: string) => reference(`${path}/${name}/${id}`),
      }),
    });
    const snapshot = (ref: any) => ({
      exists: records.has(ref.path),
      data: () => records.get(ref.path),
      get: (field: string) => records.get(ref.path)?.[field],
    });
    const db: any = {
      collection: (name: string) => ({
        doc: (id: string) => reference(`${name}/${id}`),
      }),
      runTransaction: async (work: (transaction: any) => unknown) =>
        work({
          get: async (ref: any) => snapshot(ref),
          create: (ref: any, value: Record<string, unknown>) => {
            if (records.has(ref.path)) throw new Error('already exists');
            records.set(ref.path, value);
          },
          update: (ref: any, value: Record<string, unknown>) =>
            records.set(ref.path, { ...records.get(ref.path), ...value }),
        }),
    };
    const paymentsService = { invalidateLenderCache: jest.fn() };
    const details = { lenderId: 'lender-1', loan: { id: 'loan-1' } };
    const ledgerDetailsService = { get: jest.fn().mockResolvedValue(details) };
    const notifier = {
      sendForRecordedPayment: jest.fn().mockResolvedValue(undefined),
    };
    const service = new InstallmentPaymentService(
      { getDb: () => db } as any,
      paymentsService as any,
      ledgerDetailsService as any,
      notifier as any,
    );

    await expect(
      service.record(
        'lender-1',
        'loan-1',
        'month-1',
        { amount: 4500, paymentMethod: 'qr' },
        { nonce: 'nonce-1' },
      ),
    ).resolves.toBe(details);

    expect(records.get('qrNonces/nonce-1')).toMatchObject({
      used: true,
      transactionId: 'repayment_loan-1_month-1',
    });
    expect(records.get('transactions/repayment_loan-1_month-1')).toMatchObject({
      amountMinor: 450_000,
      paymentMethod: 'qr',
    });

    await expect(
      service.record(
        'lender-1',
        'loan-1',
        'month-1',
        { amount: 4500, paymentMethod: 'qr' },
        { nonce: 'nonce-1' },
      ),
    ).resolves.toBe(details);
    expect(notifier.sendForRecordedPayment).toHaveBeenCalledTimes(1);
  });
});
