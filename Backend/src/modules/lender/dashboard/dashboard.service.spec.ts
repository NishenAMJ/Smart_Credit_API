import { DashboardService } from './dashboard.service';

function createDoc(id: string, data: Record<string, unknown>) {
  return {
    id,
    data: () => data,
  } as any;
}

describe('DashboardService', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('builds the summary response from the summary data sources', async () => {
    const db = {
      collection: jest.fn(() => ({
        where: jest.fn(() => ({
          get: jest.fn().mockResolvedValue({ docs: [] }),
        })),
      })),
    };
    const service = new DashboardService({ getDb: () => db } as any);

    jest
      .spyOn(service as any, 'getTotalBorrowersFromRelations')
      .mockResolvedValue(5);
    jest
      .spyOn(service as any, 'getTodaysPaymentsCollection')
      .mockResolvedValue(27500);
    jest.spyOn(service as any, 'getOverduePaymentsCount').mockResolvedValue(2);
    jest.spyOn(service as any, 'getActiveAdsCount').mockResolvedValue(3);

    const result = await service.getSummary('lender_1');

    expect(result.summary).toEqual({
      totalBorrowers: 5,
      todaysCollection: 27500,
      overduePayments: 2,
      activeAds: 3,
    });
    expect(result.generatedAt).toEqual(expect.any(String));
  });

  it('returns paged borrowers with cursor page info from lender relations', async () => {
    const db = {
      collection: jest.fn(() => ({
        where: jest.fn(() => ({
          get: jest.fn().mockResolvedValue({ docs: [] }),
        })),
      })),
    };
    const service = new DashboardService({ getDb: () => db } as any);

    jest.spyOn(service as any, 'getBorrowersFromRelations').mockResolvedValue({
      borrowers: [
        {
          id: 'borrower_1',
          fullName: 'Borrower One',
          email: 'borrower1@example.com',
          creditScore: 720,
          kycStatus: 'verified',
          loanCount: 2,
          activeLoansCount: 1,
          totalBorrowedAmount: 100000,
          outstandingAmount: 40000,
          latestLoanStatus: 'active',
          latestLoanCreatedAt: '2026-04-01T00:00:00.000Z',
          isActive: true,
          createdAt: '2026-01-01T00:00:00.000Z',
        },
      ],
      pageInfo: {
        pageSize: 8,
        hasMore: true,
        nextCursor: 'cursor_1',
      },
    });

    const result = await service.getBorrowers('lender_1', 8, null);

    expect(result.borrowers).toHaveLength(1);
    expect(result.pageInfo).toEqual({
      pageSize: 8,
      hasMore: true,
      nextCursor: 'cursor_1',
    });
    expect(result.generatedAt).toEqual(expect.any(String));
  });

  it('falls back to loan-derived borrowers when relation data is unavailable', async () => {
    const db = {
      collection: jest.fn().mockImplementation((collectionName: string) => {
        if (collectionName === 'lenderBorrowers') {
          return {
            where: jest.fn(() => ({
              get: jest.fn().mockResolvedValue({ empty: true, docs: [] }),
            })),
          };
        }

        if (collectionName === 'users') {
          return {
            doc: jest.fn((borrowerId: string) => ({ id: borrowerId })),
          };
        }

        if (collectionName === 'loans') {
          return {
            where: jest.fn(() => ({
              get: jest.fn().mockResolvedValue({
                docs: [
                  {
                    id: 'loan_1',
                    data: () => ({
                      borrowerId: 'borrower_1',
                      amount: 100000,
                      remainingAmount: 40000,
                      interestRate: 12,
                      tenureMonths: 12,
                      status: 'active',
                      createdAt: '2026-04-01T00:00:00.000Z',
                    }),
                  },
                ],
              }),
            })),
          };
        }

        return {};
      }),
      getAll: jest.fn().mockResolvedValue([
        {
          id: 'borrower_1',
          data: () => ({
            role: 'borrower',
            fullName: 'Borrower One',
            email: 'borrower1@example.com',
            creditScore: 720,
            kycStatus: 'verified',
            createdAt: '2026-01-01T00:00:00.000Z',
          }),
        },
      ]),
      doc: jest.fn(),
    };

    const service = new DashboardService({ getDb: () => db } as any);

    jest
      .spyOn(service as any, 'getBorrowersFromRelations')
      .mockResolvedValue(null);
    jest.spyOn(service as any, 'mapLoan').mockResolvedValue({
      id: 'loan_1',
      borrowerId: 'borrower_1',
      amount: 100000,
      remainingAmount: 40000,
      interestRate: 12,
      tenureMonths: 12,
      status: 'active',
      createdAt: new Date('2026-04-01T00:00:00.000Z'),
    });

    const result = await service.getBorrowers('lender_1', 8, null);

    expect(result.borrowers).toHaveLength(1);
    expect(result.borrowers[0]).toMatchObject({
      id: 'borrower_1',
      fullName: 'Borrower One',
      email: 'borrower1@example.com',
      loanCount: 1,
      outstandingAmount: 40000,
    });
  });

  it('passes the search term into the loan-derived fallback when relation data is unavailable', async () => {
    const db = {
      collection: jest.fn(() => ({
        where: jest.fn(() => ({
          get: jest.fn().mockResolvedValue({ docs: [] }),
        })),
      })),
    };
    const service = new DashboardService({ getDb: () => db } as any);

    jest
      .spyOn(service as any, 'getBorrowersFromRelations')
      .mockResolvedValue(null);
    jest.spyOn(service as any, 'mapLoan').mockResolvedValue({
      id: 'loan_1',
      borrowerId: 'borrower_1',
      amount: 100000,
      remainingAmount: 40000,
      interestRate: 12,
      tenureMonths: 12,
      status: 'active',
      createdAt: new Date('2026-04-01T00:00:00.000Z'),
    });
    const getRecentBorrowersSpy = jest
      .spyOn(service as any, 'getRecentBorrowers')
      .mockResolvedValue({
        borrowers: [],
        pageInfo: {
          pageSize: 8,
          hasMore: false,
          nextCursor: null,
        },
      });

    await service.getBorrowers('lender_1', 8, null, 'ann');

    expect(getRecentBorrowersSpy).toHaveBeenCalledWith(
      db,
      expect.any(Array),
      8,
      null,
      'ann',
    );
  });

  it('falls back overdue count to nested installments when aggregate query fails', async () => {
    const overdueInstallment = createDoc('inst_overdue', { status: 'overdue' });
    const nonOverdueInstallment = createDoc('inst_paid', { status: 'paid' });

    const db = {
      collectionGroup: jest.fn(() => ({
        where: jest.fn(() => ({
          where: jest.fn(() => ({
            count: jest.fn(() => ({
              get: jest.fn().mockRejectedValue({ code: 9 }),
            })),
          })),
        })),
      })),
      collection: jest.fn(() => ({
        where: jest.fn(() => ({
          get: jest.fn().mockResolvedValue({
            docs: [{ id: 'loan_1' }],
          }),
        })),
        doc: jest.fn(() => ({
          collection: jest.fn(() => ({
            get: jest.fn().mockResolvedValue({
              docs: [overdueInstallment, nonOverdueInstallment],
            }),
          })),
        })),
      })),
    };

    const service = new DashboardService({ getDb: () => db } as any);

    const result = await (service as any).getOverduePaymentsCount(
      db,
      'lender_1',
    );

    expect(result).toBe(1);
  });

  it('returns an empty borrower page instead of falling back when a search has no relation matches', async () => {
    const getMock = jest.fn().mockResolvedValue({ empty: true, docs: [] });
    const db = {
      collection: jest.fn((collectionName: string) => {
        if (collectionName === 'lenderBorrowers') {
          return {
            where: jest.fn(() => ({
              where: jest.fn(() => ({
                get: getMock,
              })),
              get: getMock,
            })),
          };
        }

        return {
          where: jest.fn(() => ({
            get: jest.fn().mockResolvedValue({ docs: [] }),
          })),
        };
      }),
    };
    const service = new DashboardService({ getDb: () => db } as any);

    const getRecentBorrowersSpy = jest.spyOn(
      service as any,
      'getRecentBorrowers',
    );

    const result = await service.getBorrowers(
      'lender_1',
      8,
      null,
      'missing borrower',
    );

    expect(result.borrowers).toEqual([]);
    expect(result.pageInfo).toEqual({
      pageSize: 8,
      hasMore: false,
      nextCursor: null,
    });
    expect(getRecentBorrowersSpy).not.toHaveBeenCalled();
  });

  it('matches borrower search terms by token prefix instead of broad substring fragments', async () => {
    const service = new DashboardService({ getDb: () => ({}) } as any);

    expect(
      (service as any).borrowerMatchesSearch(
        {
          id: 'borrower_1',
          fullName: 'Ann Perera',
          email: 'ann.perera@example.com',
        },
        'ann per',
      ),
    ).toBe(true);

    expect(
      (service as any).borrowerMatchesSearch(
        {
          id: 'borrower_2',
          fullName: 'Joanna Silva',
          email: 'joanna@example.com',
        },
        'ann',
      ),
    ).toBe(false);
  });
});
