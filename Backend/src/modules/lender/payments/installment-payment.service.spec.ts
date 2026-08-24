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
          remainingBalanceMinor: 900_000,
        },
      ],
      [
        'loans/loan-1/installments/month-1',
        {
          installmentId: 'month-1',
          sequence: 1,
          status: 'due',
          amountDueMinor: 450_000,
          dueAt: Timestamp.now(),
        },
      ],
      [
        'loans/loan-1/installments/month-2',
        {
          installmentId: 'month-2',
          sequence: 2,
          status: 'scheduled',
          amountDueMinor: 450_000,
          dueAt: Timestamp.fromMillis(Date.now() + 30 * 24 * 60 * 60 * 1000),
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
      collection: (name: string) => collection(`${path}/${name}`),
    });
    const collection = (path: string): any => ({
      path,
      isCollection: true,
      doc: (id: string) => reference(`${path}/${id}`),
    });
    const snapshot = (ref: any) => ({
      exists: records.has(ref.path),
      data: () => records.get(ref.path),
      get: (field: string) => records.get(ref.path)?.[field],
    });
    const db: any = {
      collection: (name: string) => collection(name),
      runTransaction: async (work: (transaction: any) => unknown) =>
        work({
          get: async (ref: any) =>
            ref.isCollection
              ? {
                  docs: [...records.keys()]
                    .filter((path) => {
                      const suffix = path.slice(ref.path.length + 1);
                      return (
                        path.startsWith(`${ref.path}/`) && !suffix.includes('/')
                      );
                    })
                    .map((path) => {
                      const documentRef = reference(path);
                      return { ...snapshot(documentRef), id: documentRef.id };
                    }),
                }
              : snapshot(ref),
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
      service.record('lender-1', 'loan-1', 'month-2', {
        amount: 4500,
        paymentMethod: 'cash',
      }),
    ).rejects.toThrow(
      'Installments must be paid in order. Record the earliest unpaid installment first.',
    );
    expect(records.has('transactions/repayment_loan-1_month-2')).toBe(false);

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
      platformFeeMinor: 0,
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
