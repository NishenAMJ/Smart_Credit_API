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

    const service = new DashboardService({ getDb: () => db } as any);

    const result = await (service as any).getOverduePaymentsCount(
      db,
      'lender_1',
      [{ id: 'loan_1' }],
    );

    expect(result).toBe(1);
  });
});
