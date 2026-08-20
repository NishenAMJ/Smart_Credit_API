import { ReportsService } from './reports.service';
import { FirebaseService } from '../../firebase/firebase.service';

describe('ReportsService', () => {
  it('counts user roles from the canonical roles array', async () => {
    const counts: Record<string, number> = {
      all: 19,
      'status:suspended': 0,
      'status:inactive': 0,
      'accountStatus:pending': 1,
      'roles:borrower': 11,
      'roles:lender': 6,
      'roles:admin': 2,
      'createdAt:date': 3,
    };
    const where = jest.fn(
      (field: string, _operator: string, value: unknown) => ({
        count: () => ({
          get: async () => ({
            data: () => ({
              count:
                counts[
                  `${field}:${value instanceof Date ? 'date' : String(value)}`
                ] ?? 0,
            }),
          }),
        }),
      }),
    );
    const usersCollection = {
      where,
      count: () => ({
        get: async () => ({ data: () => ({ count: counts.all }) }),
      }),
    };
    const firebaseService = {
      db: { collection: jest.fn(() => usersCollection) },
    } as unknown as FirebaseService;
    const service = new ReportsService(firebaseService);

    const response = await service.getUsersReport();

    expect(where).toHaveBeenCalledWith('roles', 'array-contains', 'borrower');
    expect(where).toHaveBeenCalledWith('roles', 'array-contains', 'lender');
    expect(where).toHaveBeenCalledWith('roles', 'array-contains', 'admin');
    expect(response.data.usersByRole).toEqual({
      borrower: 11,
      lender: 6,
      admin: 2,
    });
  });

  it('uses aggregate sums without loading loan or transaction snapshots', async () => {
    const aggregateGet = jest.fn().mockResolvedValue({
      data: () => ({ count: 4, total: 100_000 }),
    });
    const countGet = jest.fn().mockResolvedValue({
      data: () => ({ count: 1 }),
    });
    const query = {
      where: jest.fn(),
      count: jest.fn(() => ({ get: countGet })),
      aggregate: jest.fn(() => ({ get: aggregateGet })),
    };
    query.where.mockReturnValue(query);
    const firebaseService = {
      db: { collection: jest.fn(() => query) },
    } as unknown as FirebaseService;
    const service = new ReportsService(firebaseService);

    const [loans, transactions] = await Promise.all([
      service.getLoansReport(),
      service.getTransactionsReport(),
    ]);

    expect(query.aggregate).toHaveBeenCalledTimes(2);
    expect(loans.data.totalLoanAmount).toBe(1_000);
    expect(transactions.data.totalTransactionVolume).toBe(1_000);
    expect(query).not.toHaveProperty('get');
  });
});
