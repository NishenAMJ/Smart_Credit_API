import { DashboardService } from './dashboard.service';
import { DashboardSummaryService } from './dashboard-summary.service';

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
      collection: jest.fn((collectionName: string) => {
        if (collectionName === 'users') {
          return {
            doc: jest.fn(() => ({
              get: jest.fn().mockResolvedValue({
                data: () => ({ fullName: 'Lender One' }),
              }),
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
    const summary = {
      getSummary: jest.fn().mockResolvedValue({
        summary: {
          totalBorrowers: 5,
          todaysCollection: 27500,
          overduePayments: 2,
          activeAds: 3,
        },
        generatedAt: new Date().toISOString(),
      }),
    };
    const service = new DashboardService(
      { getDb: () => db } as any,
      summary as any,
    );

    const result = await service.getSummary('lender_1');

    expect(result.summary).toEqual({
      lenderName: 'Lender One',
      totalBorrowers: 5,
      todaysCollection: 27500,
      overduePayments: 2,
      activeAds: 3,
    });
    expect(result.generatedAt).toEqual(expect.any(String));
  });

  it('returns paged borrowers aggregated from canonical lender loans', async () => {
    const db = {
      collection: jest.fn(() => ({
        where: jest.fn(() => ({
          get: jest.fn().mockResolvedValue({ docs: [] }),
        })),
      })),
    };
    const service = new DashboardService({ getDb: () => db } as any, {} as any);

    jest.spyOn(service as any, 'getRecentBorrowers').mockResolvedValue({
      borrowers: [
        {
          id: 'borrower_1',
          fullName: 'Borrower One',
          email: 'borrower1@example.com',
          phone: '+94770000001',
          creditScore: 720,
          kycStatus: 'verified',
          loanCount: 2,
          activeLoansCount: 1,
          totalBorrowedAmount: 100000,
          outstandingAmount: 40000,
          latestLoanStatus: 'active',
          latestLoanCreatedAt: '2026-04-01T00:00:00.000Z',
          firstLoanCreatedAt: '2026-02-01T00:00:00.000Z',
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

  it('maps schema-v2 roles and nested borrower credit score', () => {
    const service = new DashboardService({} as any, {} as any);
    const result = (service as any).mapBorrower(
      'borrower_1',
      {
        roles: ['borrower'],
        fullName: 'Borrower One',
        email: 'borrower@example.com',
        accountStatus: 'active',
        kycStatus: 'approved',
        borrowerProfile: { creditScore: 735 },
      },
      [
        {
          id: 'loan_1',
          borrowerId: 'borrower_1',
          amount: 100000,
          remainingAmount: 60000,
          status: 'active',
          createdAt: new Date('2026-07-01T00:00:00.000Z'),
        },
      ],
    );

    expect(result).toMatchObject({
      id: 'borrower_1',
      creditScore: 735,
      loanCount: 1,
      activeLoansCount: 1,
      totalBorrowedAmount: 100000,
      outstandingAmount: 60000,
      isActive: true,
    });
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
        doc: jest.fn(() => ({
          collection: jest.fn(() => ({
            get: jest.fn().mockResolvedValue({
              docs: [overdueInstallment, nonOverdueInstallment],
            }),
          })),
        })),
      })),
    };

    const service = new DashboardSummaryService({ getDb: () => db } as any);

    const result = await (service as any).getOverduePayments(db, 'lender_1', [
      { id: 'loan_1' },
    ]);

    expect(result).toBe(1);
  });
});
