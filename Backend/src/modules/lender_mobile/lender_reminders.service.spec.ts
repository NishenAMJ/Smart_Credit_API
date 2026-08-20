import { Timestamp } from 'firebase-admin/firestore';
import { LenderRemindersService } from './lender_reminders.service';

describe('LenderRemindersService', () => {
  it('reads canonical nested installments and converts minor units', async () => {
    const dueAt = new Date(Date.now() + 2 * 86400_000);
    const installment = {
      id: 'month_001',
      get: (field: string) =>
        ({
          status: 'scheduled',
          dueAt: Timestamp.fromDate(dueAt),
          amountDueMinor: 125_000,
        })[field],
    };
    const loan = {
      id: 'loan_1',
      get: (field: string) => ({ borrowerId: 'borrower_1' })[field],
      ref: { collection: jest.fn().mockReturnValue({ get: jest.fn().mockResolvedValue({ docs: [installment] }) }) },
    };
    const query = {
      where: jest.fn(),
      limit: jest.fn(),
      get: jest.fn().mockResolvedValue({ docs: [loan] }),
    };
    query.where.mockReturnValue(query);
    query.limit.mockReturnValue(query);
    const db = {
      collection: jest.fn().mockImplementation((name: string) =>
        name === 'loans'
          ? query
          : { doc: jest.fn().mockReturnValue({}) },
      ),
      getAll: jest.fn().mockResolvedValue([
        { id: 'borrower_1', get: jest.fn().mockReturnValue('Nimali Perera') },
      ]),
    };
    const service = new LenderRemindersService({ db } as any);

    await expect(service.getReminders('lender_1')).resolves.toEqual([
      expect.objectContaining({
        id: 'loan_1_month_001',
        loanId: 'loan_1',
        borrowerName: 'Nimali Perera',
        amountDue: 1250,
        status: 'scheduled',
      }),
    ]);
  });
});
