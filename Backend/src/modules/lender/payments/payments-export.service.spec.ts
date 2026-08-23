import type { PaymentsDataService } from './payments-data.service';
import { PaymentsExportService } from './payments-export.service';

describe('PaymentsExportService', () => {
  it('exports lender-friendly rows inside the selected Sri Lanka date range', async () => {
    const loan = {
      id: 'loan_internal_1',
      borrowerId: 'borrower_1',
      amount: 50000,
      remainingAmount: 40000,
      interestRate: 12,
      tenureMonths: 12,
      status: 'active',
      createdAt: new Date('2026-01-01T00:00:00.000Z'),
    };
    const paymentsData = {
      loadLenderContext: jest.fn().mockResolvedValue({
        lenderId: 'lender_1',
        loans: [loan],
        loanIds: new Set(['loan_internal_1']),
        loanIdsList: ['loan_internal_1'],
        loanMap: new Map([['loan_internal_1', loan]]),
        borrowerMap: new Map([
          [
            'borrower_1',
            { fullName: 'Nimali Perera', email: 'nimali@example.com' },
          ],
        ]),
      }),
      getTransactions: jest.fn().mockResolvedValue([
        {
          id: 'repayment_internal_1',
          loanId: 'loan_internal_1',
          installmentId: 'month_003',
          paymentId: null,
          type: 'repayment',
          status: 'completed',
          amount: 10000,
          createdAt: new Date('2026-07-13T04:30:00.000Z'),
          source: 'transaction',
          note: 'Bank deposit',
        },
        {
          id: 'outside_range',
          loanId: 'loan_internal_1',
          installmentId: 'month_004',
          paymentId: null,
          type: 'repayment',
          status: 'completed',
          amount: 10000,
          createdAt: new Date('2026-07-14T18:30:00.000Z'),
          source: 'transaction',
          note: null,
        },
      ]),
    };
    const service = new PaymentsExportService(
      paymentsData as unknown as PaymentsDataService,
    );

    const result = await service.createCsv(
      'lender_1',
      '2026-07-13',
      '2026-07-14',
    );

    expect(result.recordCount).toBe(1);
    expect(result.fileName).toBe(
      'smart-credit-payments-2026-07-13-to-2026-07-14.csv',
    );
    expect(result.csv).toContain('Nimali Perera');
    expect(result.csv).toContain('Installment 3');
    expect(result.csv).toContain('10000.00');
    expect(result.csv).not.toContain('repayment_internal_1');
    expect(result.csv).not.toContain('loan_internal_1');
    expect(result.csv).not.toContain('outside_range');
  });
});
