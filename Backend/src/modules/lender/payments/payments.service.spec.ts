import { PaymentsService } from './payments.service';
import type { PaymentsDataService } from './payments-data.service';

function createContext() {
  const loan = {
    id: 'loan_1',
    borrowerId: 'borrower_1',
    amount: 50000,
    remainingAmount: 30000,
    interestRate: 12,
    tenureMonths: 12,
    status: 'active',
    createdAt: new Date('2026-04-01T00:00:00.000Z'),
  };

  return {
    lenderId: 'lender_1',
    loans: [loan],
    loanIds: new Set(['loan_1']),
    loanIdsList: ['loan_1'],
    loanMap: new Map([['loan_1', loan]]),
    borrowerMap: new Map([
      ['borrower_1', { fullName: 'Amal Perera', email: 'amal@example.com' }],
    ]),
  };
}

describe('PaymentsService', () => {
  it('maps lender-scoped transactions without loading optional summaries', async () => {
    const paymentsData = {
      loadLenderContext: jest.fn().mockResolvedValue(createContext()),
      getTransactionPage: jest.fn().mockResolvedValue([
        {
          id: 'repayment_1',
          loanId: 'loan_1',
          installmentId: 'month_001',
          paymentId: null,
          type: 'repayment',
          status: 'completed',
          amount: 5000,
          createdAt: new Date('2026-04-21T10:00:00.000Z'),
          source: 'transaction',
          note: null,
        },
      ]),
      getInstallmentSummaries: jest.fn().mockResolvedValue(
        new Map([
          [
            'loan_1',
            {
              totalInstallments: 12,
              paidInstallments: 1,
              overdueInstallments: 0,
              nextDueDate: '2026-05-01T00:00:00.000Z',
              latestInstallmentStatus: 'paid',
            },
          ],
        ]),
      ),
    };
    const service = new PaymentsService(
      paymentsData as unknown as PaymentsDataService,
    );

    const result = await service.getPayments(
      'lender_1',
      15,
      null,
      false,
      false,
      null,
      null,
      'payment',
    );

    expect(result.transactions).toEqual([
      expect.objectContaining({
        transactionId: 'repayment_1',
        loanId: 'loan_1',
        installmentId: 'month_001',
        borrowerId: 'borrower_1',
        borrowerName: 'Amal Perera',
        amount: 5000,
      }),
    ]);
    expect(result.summary.totalTransactions).toBe(0);
    expect(result.searchResultCount).toBeNull();
    expect(paymentsData.getTransactionPage).toHaveBeenCalledWith(
      'lender_1',
      ['repayment'],
      16,
      null,
      null,
    );
  });

  it('pushes the disbursement filter into the transaction data query', async () => {
    const paymentsData = {
      loadLenderContext: jest.fn().mockResolvedValue(createContext()),
      getTransactionPage: jest.fn().mockResolvedValue([
        {
          id: 'disbursement_1',
          loanId: 'loan_1',
          installmentId: null,
          paymentId: null,
          type: 'disbursement',
          status: 'completed',
          amount: 50000,
          createdAt: new Date('2026-04-01T10:00:00.000Z'),
          source: 'transaction',
          note: null,
        },
      ]),
      getInstallmentSummaries: jest.fn().mockResolvedValue(new Map()),
    };
    const service = new PaymentsService(
      paymentsData as unknown as PaymentsDataService,
    );

    const result = await service.getPayments(
      'lender_1',
      15,
      null,
      false,
      false,
      null,
      null,
      'disbursement',
    );

    expect(result.transactions[0]).toEqual(
      expect.objectContaining({
        transactionId: 'disbursement_1',
        type: 'disbursement',
      }),
    );
    expect(paymentsData.getTransactionPage).toHaveBeenCalledWith(
      'lender_1',
      ['disbursement'],
      16,
      null,
      null,
    );
  });

  it('applies server-side search to installment identifiers', async () => {
    const paymentsData = {
      loadLenderContext: jest.fn().mockResolvedValue(createContext()),
      getTransactionPage: jest.fn().mockResolvedValue([
        {
          id: 'selected_day_payment',
          loanId: 'loan_1',
          installmentId: 'month_002',
          paymentId: null,
          type: 'repayment',
          status: 'completed',
          amount: 5000,
          createdAt: new Date('2026-04-20T18:30:00.000Z'),
          source: 'transaction',
          note: null,
        },
      ]),
      getTransactions: jest.fn().mockResolvedValue([
        {
          id: 'repayment_1',
          loanId: 'loan_1',
          installmentId: 'month_001',
          paymentId: null,
          type: 'repayment',
          status: 'completed',
          amount: 5000,
          createdAt: new Date(),
          source: 'transaction',
          note: null,
        },
        {
          id: 'repayment_2',
          loanId: 'loan_1',
          installmentId: 'month_002',
          paymentId: null,
          type: 'repayment',
          status: 'completed',
          amount: 5000,
          createdAt: new Date(),
          source: 'transaction',
          note: null,
        },
      ]),
      getInstallmentSummaries: jest.fn().mockResolvedValue(new Map()),
    };
    const service = new PaymentsService(
      paymentsData as unknown as PaymentsDataService,
    );

    const result = await service.getPayments(
      'lender_1',
      15,
      null,
      false,
      false,
      'month_002',
    );

    expect(result.transactions).toHaveLength(1);
    expect(result.transactions[0].transactionId).toBe('repayment_2');
  });

  it('filters a daily collection using the Sri Lanka calendar day', async () => {
    const paymentsData = {
      loadLenderContext: jest.fn().mockResolvedValue(createContext()),
      getTransactionPage: jest.fn().mockResolvedValue([
        {
          id: 'selected_day_payment',
          loanId: 'loan_1',
          installmentId: 'month_002',
          paymentId: null,
          type: 'repayment',
          status: 'completed',
          amount: 5000,
          createdAt: new Date('2026-04-20T18:30:00.000Z'),
          source: 'transaction',
          note: null,
        },
      ]),
      getTransactions: jest.fn().mockResolvedValue([
        {
          id: 'previous_day_payment',
          loanId: 'loan_1',
          installmentId: 'month_001',
          paymentId: null,
          type: 'repayment',
          status: 'completed',
          amount: 4000,
          createdAt: new Date('2026-04-20T18:29:59.999Z'),
          source: 'transaction',
          note: null,
        },
        {
          id: 'selected_day_payment',
          loanId: 'loan_1',
          installmentId: 'month_002',
          paymentId: null,
          type: 'repayment',
          status: 'completed',
          amount: 5000,
          createdAt: new Date('2026-04-20T18:30:00.000Z'),
          source: 'transaction',
          note: null,
        },
        {
          id: 'next_day_payment',
          loanId: 'loan_1',
          installmentId: 'month_003',
          paymentId: null,
          type: 'repayment',
          status: 'completed',
          amount: 6000,
          createdAt: new Date('2026-04-21T18:30:00.000Z'),
          source: 'transaction',
          note: null,
        },
      ]),
      getInstallmentSummaries: jest.fn().mockResolvedValue(new Map()),
    };
    const service = new PaymentsService(
      paymentsData as unknown as PaymentsDataService,
    );

    const result = await service.getPayments(
      'lender_1',
      15,
      null,
      true,
      false,
      null,
      '2026-04-21',
    );

    expect(result.transactions.map((item) => item.transactionId)).toEqual([
      'selected_day_payment',
    ]);
    expect(result.summary.totalTransactions).toBe(1);
    expect(result.summary.totalCollected).toBe(5000);
  });

  it('caches lender context between list requests', async () => {
    const paymentsData = {
      loadLenderContext: jest.fn().mockResolvedValue(createContext()),
      getTransactionPage: jest.fn().mockResolvedValue([]),
      getTransactions: jest.fn().mockResolvedValue([]),
      getInstallmentSummaries: jest.fn().mockResolvedValue(new Map()),
    };
    const service = new PaymentsService(
      paymentsData as unknown as PaymentsDataService,
    );

    await service.getPayments('lender_1', 15, null, false, false);
    await service.getPayments('lender_1', 15, null, false, false);

    expect(paymentsData.loadLenderContext).toHaveBeenCalledTimes(1);
  });
});
