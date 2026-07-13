import { PaymentLedgerDetailsService } from './payment-ledger-details.service';

function createDoc(id: string, data: Record<string, unknown>) {
  return { id, data: () => data } as any;
}

describe('PaymentLedgerDetailsService', () => {
  it('groups immutable repayment transactions under their installments', async () => {
    const installments = {
      docs: [
        createDoc('month_001', {
          status: 'paid',
          amountDueMinor: 500000,
          dueAt: new Date('2026-04-20T00:00:00.000Z'),
          paidAt: new Date('2026-04-19T00:00:00.000Z'),
        }),
      ],
    };
    const loan = {
      id: 'loan_1',
      exists: true,
      get: (field: string) => (field === 'lenderId' ? 'lender_1' : null),
      data: () => ({
        lenderId: 'lender_1',
        borrowerId: 'borrower_1',
        principalMinor: 5000000,
        remainingBalanceMinor: 4500000,
        annualInterestRate: 12,
        tenureMonths: 12,
        status: 'active',
        createdAt: new Date('2026-03-01T00:00:00.000Z'),
      }),
      ref: {
        collection: jest.fn().mockReturnValue({
          get: jest.fn().mockResolvedValue(installments),
        }),
      },
    };
    const db = {
      collection: jest.fn((name: string) => {
        if (name === 'loans') {
          return { doc: jest.fn().mockReturnValue({ get: async () => loan }) };
        }
        return {
          where: jest.fn().mockReturnValue({
            get: jest.fn().mockResolvedValue({
              docs: [
                createDoc('repayment_loan_1_month_001', {
                  loanId: 'loan_1',
                  installmentId: 'month_001',
                  type: 'repayment',
                  status: 'completed',
                  amountMinor: 500000,
                  completedAt: new Date('2026-04-19T00:00:00.000Z'),
                }),
              ],
            }),
          }),
        };
      }),
    };
    const service = new PaymentLedgerDetailsService({
      getDb: () => db,
    } as any);

    const result = await service.get('lender_1', 'loan_1');

    expect(result?.installments[0].payments).toEqual([
      expect.objectContaining({
        id: 'repayment_loan_1_month_001',
        amount: 5000,
        source: 'transaction',
      }),
    ]);
  });
});
