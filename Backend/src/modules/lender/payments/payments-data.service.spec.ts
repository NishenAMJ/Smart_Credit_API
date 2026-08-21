import { PaymentsDataService } from './payments-data.service';

function createHarness() {
  const docs = [
    {
      id: 'repayment_1',
      data: () => ({
        loanId: 'loan_1',
        installmentId: 'month_001',
        type: 'repayment',
        status: 'completed',
        amountMinor: 500000,
        createdAt: new Date('2026-04-21T10:00:00.000Z'),
      }),
    },
  ];
  const query = {
    where: jest.fn(),
    get: jest.fn().mockResolvedValue({ docs }),
  };
  query.where.mockReturnValue(query);
  const db = { collection: jest.fn().mockReturnValue(query) };
  const service = new PaymentsDataService({ getDb: () => db } as any);

  return { service, query };
}

describe('PaymentsDataService transaction filtering', () => {
  it('adds a Firestore equality filter for payment-only reads', async () => {
    const { service, query } = createHarness();

    const result = await service.getTransactions(new Set(['loan_1']), [
      'repayment',
    ]);

    expect(query.where).toHaveBeenNthCalledWith(1, 'loanId', 'in', ['loan_1']);
    expect(query.where).toHaveBeenNthCalledWith(2, 'type', '==', 'repayment');
    expect(result).toHaveLength(1);
  });

  it('uses a Firestore in filter for combined payment activity', async () => {
    const { service, query } = createHarness();

    await service.getTransactions(new Set(['loan_1']), [
      'repayment',
      'disbursement',
    ]);

    expect(query.where).toHaveBeenNthCalledWith(2, 'type', 'in', [
      'repayment',
      'disbursement',
    ]);
  });
});
