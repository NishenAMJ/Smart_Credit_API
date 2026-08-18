import {
  DEFAULT_PAYMENT_RECEIVED_SMS_TEMPLATE,
  PaymentReceivedSmsService,
  readPaymentReceivedSmsSettings,
} from './payment-received-sms.service';

function createSmsProvider() {
  return {
    isConfigured: jest.fn().mockReturnValue(true),
    getSenderId: jest.fn().mockReturnValue('SmartCredit'),
    send: jest.fn().mockResolvedValue('provider_payment_1'),
  };
}

describe('PaymentReceivedSmsService', () => {
  it('provides a safe default message for an unconfigured lender', () => {
    expect(readPaymentReceivedSmsSettings({})).toEqual({
      enabled: false,
      template: DEFAULT_PAYMENT_RECEIVED_SMS_TEMPLATE,
      updatedAt: null,
    });
  });

  it('sends the saved message once and records delivery metadata', async () => {
    const settingsRef = {
      get: jest.fn().mockResolvedValue({
        data: () => ({
          enabled: true,
          paymentReceived: {
            enabled: true,
            template:
              'Hello {{borrowerName}}, received {{amount}}. Balance {{remainingBalance}}.',
          },
        }),
      }),
    };
    const deliveryRef = {
      id: 'payment_received_repayment_1',
      get: jest.fn().mockResolvedValue({ exists: false }),
    };
    const borrowerRef = {
      get: jest.fn().mockResolvedValue({
        exists: true,
        data: () => ({
          fullName: 'Borrower One',
          phone: '+94770000001',
        }),
      }),
    };
    const batchCreate = jest.fn();
    const batchCommit = jest.fn().mockResolvedValue(undefined);
    const db = {
      collection: jest.fn((name: string) => ({
        doc: jest.fn(() => {
          if (name === 'systemSettings') return settingsRef;
          if (name === 'smsDeliveries') return deliveryRef;
          if (name === 'users') return borrowerRef;
          return { id: 'audit_1' };
        }),
      })),
      batch: jest.fn(() => ({
        create: batchCreate,
        commit: batchCommit,
      })),
    };
    const smsProvider = createSmsProvider();
    const service = new PaymentReceivedSmsService(
      { getDb: () => db } as any,
      smsProvider,
    );

    await service.sendForRecordedPayment({
      transactionId: 'repayment_1',
      lenderId: 'lender_1',
      borrowerId: 'borrower_1',
      loanId: 'loan_1',
      amountMinor: 125000,
      remainingBalanceMinor: 375000,
      paidAt: new Date('2026-08-18T08:00:00.000Z'),
    });

    expect(smsProvider.send).toHaveBeenCalledWith({
      to: '+94770000001',
      message:
        'Hello Borrower One, received LKR 1,250.00. Balance LKR 3,750.00.',
    });
    expect(batchCreate).toHaveBeenCalledTimes(2);
    expect(batchCommit).toHaveBeenCalledTimes(1);
  });

  it('does not send when the global SMS switch is paused', async () => {
    const settingsRef = {
      get: jest.fn().mockResolvedValue({
        data: () => ({
          enabled: false,
          paymentReceived: {
            enabled: true,
            template: 'Payment received.',
          },
        }),
      }),
    };
    const db = {
      collection: jest.fn((name: string) => ({
        doc: jest.fn(() => {
          if (name === 'systemSettings') return settingsRef;
          if (name === 'smsDeliveries') {
            return {
              get: jest.fn().mockResolvedValue({ exists: false }),
            };
          }
          return {
            get: jest.fn().mockResolvedValue({ exists: false, data: () => {} }),
          };
        }),
      })),
    };
    const smsProvider = createSmsProvider();
    const service = new PaymentReceivedSmsService(
      { getDb: () => db } as any,
      smsProvider,
    );

    await service.sendForRecordedPayment({
      transactionId: 'repayment_1',
      lenderId: 'lender_1',
      borrowerId: 'borrower_1',
      loanId: 'loan_1',
      amountMinor: 10000,
      remainingBalanceMinor: 0,
      paidAt: new Date(),
    });

    expect(smsProvider.send).not.toHaveBeenCalled();
  });
});
