import * as seedUtils from '../firebase/firestore-seed.utils';
import { AnalyticsService } from './analytics.service';

function createDoc(id: string, data: Record<string, unknown>) {
  return {
    id,
    data: () => data,
    get: (field: string) => data[field],
  } as any;
}

describe('AnalyticsService', () => {
  it('computes overview from seed-shaped loans and ads', async () => {
    const db = {
      collection: jest.fn((name: string) => ({
        where: jest.fn().mockReturnValue({
          get: jest.fn().mockResolvedValue({
            docs:
              name === 'loans'
                ? [
                    createDoc('loan_1', {
                      lenderId: 'lender_1',
                      borrowerId: 'borrower_1',
                      principalAmount: 50000,
                      interestRate: 15,
                      tenureMonths: 12,
                      status: 'active',
                      requestId: 'req_1',
                      createdAt: '2026-04-10T00:00:00.000Z',
                    }),
                  ]
                : [
                    createDoc('ad_1', {
                      lenderId: 'lender_1',
                      status: 'approved',
                      expiresAt: '2099-01-01T00:00:00.000Z',
                    }),
                  ],
          }),
        }),
      })),
    };
    const service = new AnalyticsService({ getDb: () => db } as any);

    jest
      .spyOn(seedUtils, 'computeLoanRemainingAmount')
      .mockResolvedValue(12000);
    jest.spyOn(service as any, 'getRequestsForLender').mockResolvedValue([]);
    jest
      .spyOn(service as any, 'getTransactionsForLoanIds')
      .mockResolvedValue([]);
    jest.spyOn(service as any, 'getDisputesForLoanIds').mockResolvedValue([]);
    jest.spyOn(service as any, 'countOverdueLoans').mockResolvedValue(0);
    jest.spyOn(service as any, 'getBorrowerCreditScores').mockResolvedValue([]);

    const result = await service.getOverview('lender_1', '30d');

    expect(result.summary.totalLent).toBe(50000);
    expect(result.performance.activeAds).toBe(1);
    expect(result.portfolio.outstandingAmount).toBe(12000);
  });

  it('paginates drilldown results with page info', async () => {
    const service = new AnalyticsService({ getDb: () => ({}) } as any);
    jest.spyOn(service as any, 'loadAnalyticsContext').mockResolvedValue({
      loans: Array.from({ length: 11 }, (_, index) => ({
        id: `loan_${index + 1}`,
        borrowerId: `borrower_${index + 1}`,
        amount: 20000 + index * 1000,
        interestRate: 12,
        tenureMonths: 10,
        remainingAmount: 14000 - index * 100,
        status: 'active',
        createdAt: new Date(
          `2026-04-${String(21 - index).padStart(2, '0')}T00:00:00.000Z`,
        ),
      })),
      ads: [],
      requests: [],
      transactions: [],
      disputes: [],
      borrowerNameMap: new Map(
        Array.from({ length: 11 }, (_, index) => [
          `borrower_${index + 1}`,
          `Borrower ${index + 1}`,
        ]),
      ),
      loanMap: new Map(),
    });
    jest
      .spyOn(service as any, 'findOverdueLoanIds')
      .mockResolvedValue(new Set());

    const result = await service.getDrilldown(
      'lender_1',
      'active-loans',
      '90d',
      10,
    );

    expect(result.items).toHaveLength(10);
    expect(result.pageInfo.hasMore).toBe(true);
    expect(result.pageInfo.nextCursor).toBeTruthy();
  });
});
