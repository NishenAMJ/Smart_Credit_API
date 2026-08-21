import { BorrowerPaymentsService } from './borrower-payments.service';
import { RepaymentMethod } from '../applications/dto/loan-application.dto';
import { BorrowerService } from '../core/borrower.service';
import { createHash } from 'crypto';

type BorrowerPaymentsServiceMock = jest.Mocked<
  Pick<BorrowerService, 'makeRepayment' | 'generateQrToken' | 'verifyQrToken'>
>;

describe('BorrowerPaymentsService', () => {
  let borrowerService: BorrowerPaymentsServiceMock;
  let service: BorrowerPaymentsService;

  beforeEach(() => {
    borrowerService = {
      makeRepayment: jest.fn(),
      generateQrToken: jest.fn(),
      verifyQrToken: jest.fn(),
    };
    service = new BorrowerPaymentsService(
      borrowerService as unknown as BorrowerService,
    );
  });

  it('should delegate payment creation with default QR method', () => {
    borrowerService.makeRepayment.mockReturnValueOnce({ repaymentId: 'r1' });

    expect(
      service.makePayment({
        loanId: 'loan-1',
        borrowerId: 'borrower-1',
        amount: 1000,
      }),
    ).toEqual({ repaymentId: 'r1' });
    expect(borrowerService.makeRepayment).toHaveBeenCalledWith(
      expect.objectContaining({
        loanId: 'loan-1',
        borrowerId: 'borrower-1',
        amount: 1000,
        paymentMethod: RepaymentMethod.QR_PAYMENT,
      }),
    );
  });

  it('delegates the private receipt document reference for bank transfers', () => {
    borrowerService.makeRepayment.mockReturnValueOnce({ repaymentId: 'r2' });

    service.makePayment({
      loanId: 'loan-1',
      borrowerId: 'borrower-1',
      amount: 1000,
      paymentMethod: RepaymentMethod.BANK_TRANSFER,
      receiptDocumentId: 'receipt-1',
    });

    expect(borrowerService.makeRepayment).toHaveBeenCalledWith(
      expect.objectContaining({ receiptDocumentId: 'receipt-1' }),
    );
  });

  it('settles a successful PayHere callback through the idempotent installment ledger', async () => {
    const secret = 'payhere-secret';
    const order: Record<string, any> = {
      orderId: 'PH-1',
      loanId: 'loan-1',
      borrowerId: 'borrower-1',
      installmentId: 'month-1',
      amount: 4500,
      currency: 'LKR',
      status: 'initiated',
    };
    const orderRef = {
      get: jest.fn(async () => ({ exists: true, data: () => order })),
      update: jest.fn(async (updates) => Object.assign(order, updates)),
    };
    const firebaseService = {
      db: {
        collection: () => ({ doc: () => orderRef }),
      },
    };
    const configService = {
      get: (key: string) =>
        ({
          PAYHERE_MERCHANT_ID: 'merchant-1',
          PAYHERE_MERCHANT_SECRET: secret,
        })[key],
    };
    const coreLedgerService = {
      settleInstallment: jest.fn().mockResolvedValue({
        transactionId: 'repayment_loan-1_month-1',
        loanStatus: 'active',
      }),
    };
    const callbackService = new BorrowerPaymentsService(
      {} as any,
      configService as any,
      firebaseService as any,
      coreLedgerService as any,
    );
    const hashedSecret = createHash('md5')
      .update(secret)
      .digest('hex')
      .toUpperCase();
    const signature = createHash('md5')
      .update('merchant-1PH-14500.00LKR2' + hashedSecret)
      .digest('hex')
      .toUpperCase();
    const payload = {
      merchant_id: 'merchant-1',
      order_id: 'PH-1',
      payment_id: 'provider-payment-1',
      payhere_amount: '4500.00',
      payhere_currency: 'LKR',
      status_code: '2',
      md5sig: signature,
    };

    await expect(
      callbackService.handlePayHereNotification(payload),
    ).resolves.toMatchObject({
      completed: true,
      repaymentId: 'repayment_loan-1_month-1',
    });
    await expect(
      callbackService.handlePayHereNotification(payload),
    ).resolves.toEqual({ accepted: true, alreadyProcessed: true });
    expect(coreLedgerService.settleInstallment).toHaveBeenCalledTimes(1);
    expect(coreLedgerService.settleInstallment).toHaveBeenCalledWith(
      'loan-1',
      'month-1',
      'borrower-1',
      expect.objectContaining({
        paymentMethod: 'card',
        externalReference: 'provider-payment-1',
      }),
    );
  });
});
