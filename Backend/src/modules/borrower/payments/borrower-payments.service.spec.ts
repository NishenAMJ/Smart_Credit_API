import { BorrowerPaymentsService } from './borrower-payments.service';
import { RepaymentMethod } from '../applications/dto/loan-application.dto';
import { BorrowerService } from '../core/borrower.service';
import { createHash } from 'crypto';
import { PayHereService } from '../../../common/payhere/payhere.service';
import { ForbiddenException } from '@nestjs/common';

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

  it('marks the payable installment for retry after a receipt rejection', async () => {
    const borrowerPayments = {
      getLoans: jest.fn().mockResolvedValue([
        {
          loanId: 'loan-1',
          lenderId: 'lender-1',
          lenderName: 'Example Lender',
          status: 'active',
          outstandingBalance: 5000,
          monthlyInstallment: 5000,
          nextDueDate: new Date('2026-09-01T00:00:00.000Z'),
        },
      ]),
      getBorrowerLoanInstallments: jest.fn().mockResolvedValue([
        {
          installmentId: 'month_001',
          installmentNumber: 1,
          amount: 5000,
          paidAmount: 0,
          remainingAmount: 5000,
          status: 'scheduled',
          dueDate: new Date('2026-09-01T00:00:00.000Z'),
        },
      ]),
      getRepaymentHistory: jest.fn().mockResolvedValue([
        {
          repaymentId: 'repayment-1',
          loanId: 'loan-1',
          installmentId: 'month_001',
          lenderId: 'lender-1',
          amount: 5000,
          status: 'rejected',
          paymentMethod: 'bank_transfer',
          rejectionReason: 'The transferred amount is not visible',
          createdAt: new Date('2026-08-23T00:00:00.000Z'),
        },
      ]),
      getBorrowerRepaymentTransactions: jest.fn().mockResolvedValue([]),
      getLenderNamesMap: jest
        .fn()
        .mockResolvedValue(new Map([['lender-1', 'Example Lender']])),
    };
    const retryService = new BorrowerPaymentsService(
      borrowerPayments as any,
      {} as any,
      {} as any,
      {} as any,
    );

    const result = await retryService.getPayments('borrower-1');

    expect(result).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          paymentId: 'upcoming-loan-1',
          installmentId: 'month_001',
          status: 'RETRY_REQUIRED',
          verificationStatus: 'rejected',
          statusLabel: 'Receipt rejected',
          statusDetail: expect.stringContaining(
            'The transferred amount is not visible',
          ),
        }),
        expect.objectContaining({
          repaymentId: 'repayment-1',
          status: 'rejected',
        }),
      ]),
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
    const events = new Set<string>();
    const eventRef = (id: string) => ({
      get: jest.fn(async () => ({ exists: events.has(id) })),
      set: jest.fn(async () => {
        events.add(id);
      }),
    });
    const installmentRef = { update: jest.fn(), set: jest.fn() };
    const loanRef = {
      collection: () => ({ doc: () => installmentRef }),
      set: jest.fn(),
    };
    const firebaseService = {
      db: {
        collection: (name: string) => ({
          doc: (id: string) => {
            if (name === 'payherePayments') return orderRef;
            if (name === 'payherePaymentEvents') return eventRef(id);
            if (name === 'loans') return loanRef;
            return installmentRef;
          },
        }),
        runTransaction: async (callback: (transaction: any) => unknown) =>
          callback({
            update: (ref: any, updates: any) => ref.update(updates),
            set: (ref: any, data: any) => ref.set(data),
          }),
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
      firebaseService as any,
      coreLedgerService as any,
      new PayHereService(configService as any),
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

    const chargebackSignature = createHash('md5')
      .update('merchant-1PH-14500.00LKR-3' + hashedSecret)
      .digest('hex')
      .toUpperCase();
    await expect(
      callbackService.handlePayHereNotification({
        ...payload,
        status_code: '-3',
        md5sig: chargebackSignature,
      }),
    ).resolves.toMatchObject({ status: 'charged_back' });
    expect(order.status).toBe('charged_back');
    expect(coreLedgerService.settleInstallment).toHaveBeenCalledTimes(1);
  });

  it('does not expose a PayHere order to another borrower', async () => {
    const firebaseService = {
      db: {
        collection: () => ({
          doc: () => ({
            get: jest.fn(async () => ({
              exists: true,
              data: () => ({
                orderId: 'PH-private',
                borrowerId: 'borrower-owner',
                status: 'pending',
              }),
            })),
          }),
        }),
      },
    };
    const statusService = new BorrowerPaymentsService(
      {} as any,
      firebaseService as any,
      {} as any,
      {} as any,
    );

    await expect(
      statusService.getPayHereOrderStatus('PH-private', 'borrower-other'),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });
});
