import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { ReceiptVerificationService } from './receipt-verification.service';

describe('ReceiptVerificationService', () => {
  const lenderId = 'lender-1';
  const borrowerId = 'borrower-1';
  const transactionId = 'transaction-1';
  const loanId = 'loan-1';
  const installmentId = 'month_001';
  const repaymentId = 'repayment-1';
  const documentId = 'receipt-1';

  function createHarness(
    overrides: Record<string, Record<string, unknown>> = {},
  ) {
    const records: Record<string, Record<string, unknown>> = {
      [`transactions/${transactionId}`]: {
        transactionId,
        type: 'repayment',
        status: 'pending_verification',
        paymentMethod: 'bank_transfer',
        lenderId,
        borrowerId,
        loanId,
        installmentId,
        repaymentId,
        receiptDocumentId: documentId,
        amountMinor: 10_000,
      },
      [`loans/${loanId}`]: {
        lenderId,
        borrowerId,
        status: 'active',
        amountPaidMinor: 0,
        remainingBalanceMinor: 20_000,
      },
      [`loans/${loanId}/installments/${installmentId}`]: {
        status: 'due',
        amountDueMinor: 10_000,
      },
      [`repayments/${repaymentId}`]: { repaymentId },
      [`documents/${documentId}`]: {
        userId: borrowerId,
        category: 'payment_receipt',
        relatedEntityType: 'loan',
        relatedEntityId: loanId,
      },
      ...overrides,
    };
    const makeRef = (path: string): any => ({
      path,
      id: path.split('/').at(-1),
      collection: (name: string) => ({
        doc: (id: string) => makeRef(`${path}/${name}/${id}`),
      }),
    });
    const collection = (name: string): any => ({
      doc: (id: string) => makeRef(`${name}/${id}`),
    });
    const update = jest.fn();
    const transaction = {
      get: jest.fn(async (ref: { path: string }) => {
        const data = records[ref.path];
        return {
          exists: Boolean(data),
          data: () => data,
          get: (field: string) => data?.[field],
        };
      }),
      update,
    };
    const db = {
      collection,
      runTransaction: jest.fn(async (callback: Function) =>
        callback(transaction),
      ),
    };
    const paymentsService = { invalidateLenderCache: jest.fn() };
    const service = new ReceiptVerificationService(
      { getDb: () => db } as any,
      paymentsService as any,
    );
    return { service, update, paymentsService };
  }

  it('approves a matching full-installment receipt atomically', async () => {
    const { service, update, paymentsService } = createHarness();

    await expect(
      service.decide(lenderId, transactionId, {
        decision: 'approve',
        note: 'Matched bank statement',
      }),
    ).resolves.toMatchObject({ decision: 'approved', loanId, transactionId });

    expect(update).toHaveBeenCalledWith(
      expect.objectContaining({ path: `transactions/${transactionId}` }),
      expect.objectContaining({
        status: 'completed',
        verificationStatus: 'approved',
        verifiedByLender: true,
      }),
    );
    expect(update).toHaveBeenCalledWith(
      expect.objectContaining({
        path: `loans/${loanId}/installments/${installmentId}`,
      }),
      expect.objectContaining({
        status: 'paid',
        paidTransactionId: transactionId,
      }),
    );
    expect(update).toHaveBeenCalledWith(
      expect.objectContaining({ path: `loans/${loanId}` }),
      expect.objectContaining({
        amountPaidMinor: 10_000,
        remainingBalanceMinor: 10_000,
      }),
    );
    expect(paymentsService.invalidateLenderCache).toHaveBeenCalledWith(
      lenderId,
    );
  });

  it('rejects a receipt without changing installment or loan balances', async () => {
    const { service, update } = createHarness();

    await expect(
      service.decide(lenderId, transactionId, {
        decision: 'reject',
        note: 'Amount is not visible',
      }),
    ).resolves.toMatchObject({ decision: 'rejected' });

    expect(update).toHaveBeenCalledWith(
      expect.objectContaining({ path: `transactions/${transactionId}` }),
      expect.objectContaining({
        status: 'rejected',
        verificationStatus: 'rejected',
        rejectionReason: 'Amount is not visible',
      }),
    );
    expect(
      update.mock.calls.some(
        ([ref]) =>
          ref.path === `loans/${loanId}` ||
          ref.path === `loans/${loanId}/installments/${installmentId}`,
      ),
    ).toBe(false);
  });

  it('requires a rejection reason', async () => {
    const { service } = createHarness();
    await expect(
      service.decide(lenderId, transactionId, {
        decision: 'reject',
        note: ' ',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('prevents another lender from reviewing the receipt', async () => {
    const { service } = createHarness();
    await expect(
      service.decide('other-lender', transactionId, { decision: 'approve' }),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('rejects amounts that do not match the full installment', async () => {
    const { service } = createHarness({
      [`loans/${loanId}/installments/${installmentId}`]: {
        status: 'due',
        amountDueMinor: 12_000,
      },
    });
    await expect(
      service.decide(lenderId, transactionId, { decision: 'approve' }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});
