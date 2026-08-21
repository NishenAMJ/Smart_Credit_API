import { Timestamp } from 'firebase-admin/firestore';
import { QrScannerService } from './qr-scanner.service';

describe('QrScannerService', () => {
  it('verifies a signed token and delegates to the canonical installment ledger', async () => {
    const payload = {
      loanId: 'loan_1',
      borrowerId: 'borrower_1',
      amount: 4500,
      nonce: 'nonce_1',
      issuedAt: Date.now(),
    };
    const borrowerService = {
      verifyQrToken: jest.fn().mockResolvedValue({ valid: true, payload }),
    };
    const installment = {
      id: 'month_001',
      get: (field: string) =>
        ({
          status: 'due',
          dueAt: Timestamp.fromDate(new Date()),
          amountDueMinor: 450_000,
        })[field],
    };
    const loanRef = {
      get: jest.fn().mockResolvedValue({
        exists: true,
        get: (field: string) =>
          ({ lenderId: 'lender_1', borrowerId: 'borrower_1' })[field],
      }),
      collection: jest.fn().mockReturnValue({
        get: jest.fn().mockResolvedValue({ docs: [installment] }),
      }),
    };
    const db = {
      collection: jest.fn().mockReturnValue({
        doc: jest.fn().mockReturnValue(loanRef),
      }),
    };
    const installmentPaymentService = {
      record: jest.fn().mockResolvedValue({ loan: { id: 'loan_1' } }),
    };
    const service = new QrScannerService(
      { getDb: () => db } as any,
      borrowerService as any,
      installmentPaymentService as any,
    );

    const result = await service.processPaymentSlipScan(
      { qrData: 'signed-token' },
      'lender_1',
    );

    expect(borrowerService.verifyQrToken).toHaveBeenCalledWith(
      'signed-token',
      false,
      true,
    );
    expect(installmentPaymentService.record).toHaveBeenCalledWith(
      'lender_1',
      'loan_1',
      'month_001',
      expect.objectContaining({ amount: 4500 }),
      { nonce: 'nonce_1' },
    );
    expect(result.data.transactionId).toBe('repayment_loan_1_month_001');
  });
});
