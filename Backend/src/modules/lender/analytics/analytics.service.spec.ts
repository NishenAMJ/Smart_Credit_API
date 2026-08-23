import { AnalyticsDrilldownService } from './analytics-drilldown.service';
import { AnalyticsService } from './analytics.service';

describe('AnalyticsService', () => {
  it('computes summary from seed-shaped loans and ads', async () => {
    const analyticsData = {
      loadSummaryContext: jest.fn().mockResolvedValue({
        loans: [
          {
            id: 'loan_1',
            requestId: 'req_1',
            borrowerId: 'borrower_1',
            amount: 50000,
            interestRate: 15,
            tenureMonths: 12,
            remainingAmount: 12000,
            status: 'active',
            createdAt: new Date(),
          },
        ],
        ads: [
          {
            id: 'ad_1',
            title: 'Ad',
            status: 'approved',
            expiresAt: new Date('2099-01-01T00:00:00.000Z'),
          },
        ],
        requests: [],
        transactions: [],
        disputes: [],
        borrowerScores: [],
      }),
      countOverdueLoans: jest.fn().mockResolvedValue(0),
    };
    const service = new AnalyticsService(analyticsData as any, {} as any);

    const result = await service.getSummary('lender_1', '30d');

    expect(result.summary.totalLent).toBe(50000);
    expect(result.performance.activeAds).toBe(1);
    expect(result.portfolio.outstandingAmount).toBe(12000);
  });

  it('paginates drilldown results with page info', async () => {
    const analyticsData = {
      loadAnalyticsContext: jest.fn().mockResolvedValue({
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
      }),
      findOverdueLoanIds: jest.fn().mockResolvedValue(new Set()),
    };
    const service = new AnalyticsDrilldownService(analyticsData as any);

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
