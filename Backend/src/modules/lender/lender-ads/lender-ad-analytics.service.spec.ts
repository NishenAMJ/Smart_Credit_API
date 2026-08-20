import { LenderAdAnalyticsService } from './lender-ad-analytics.service';

function createAggregateCollection(counts: Record<string, number> = {}) {
  return {
    where: jest.fn().mockImplementation(() => ({
      where: jest.fn().mockImplementation(
        (_field: string, _operator: string, status: string | string[]) => ({
          count: jest.fn().mockReturnValue({
            get: jest.fn().mockResolvedValue({
              data: () => ({
                count: Array.isArray(status)
                  ? status.reduce((sum, item) => sum + (counts[item] ?? 0), 0)
                  : counts[status] ?? 0,
              }),
            }),
          }),
        }),
      ),
    })),
  };
}

describe('LenderAdAnalyticsService', () => {
  it('returns canonical lifetime analytics and excludes unfunded statuses', async () => {
    const listingData = {
      lenderId: 'lender_1',
      title: 'Working capital',
      status: 'active',
      createdAt: '2026-04-01T00:00:00.000Z',
      expiresAt: '2026-05-01T00:00:00.000Z',
    };
    const listingSnapshot = {
      exists: true,
      get: (field: string) => listingData[field as keyof typeof listingData],
      data: () => listingData,
    };
    const applications = createAggregateCollection({
      submitted: 2,
      under_review: 1,
      approved: 1,
      rejected: 1,
      converted: 3,
    });
    const loans = createAggregateCollection({
      active: 1,
      overdue: 1,
      completed: 1,
      defaulted: 0,
      pending_disbursement: 99,
      cancelled: 99,
    });
    const db = {
      collection: jest.fn().mockImplementation((name: string) => {
        if (name === 'loanApplications') return applications;
        if (name === 'loans') return loans;
        return {
          doc: jest
            .fn()
            .mockReturnValue({ get: async () => listingSnapshot }),
        };
      }),
    };
    const service = new LenderAdAnalyticsService({ getDb: () => db } as any);

    const result = await service.getAdAnalytics('lender_1', 'ad_1');

    expect(result.applications.total).toBe(8);
    expect(result.loans.funded).toBe(3);
    expect(result.fundingRate).toBe(37.5);
    expect(result.loans).toEqual({
      funded: 3,
      active: 1,
      overdue: 1,
      completed: 1,
      defaulted: 0,
    });
  });

  it('returns zero analytics when an owned listing has no activity', async () => {
    const listingSnapshot = {
      exists: true,
      get: (field: string) => (field === 'lenderId' ? 'lender_1' : undefined),
      data: () => ({ title: 'New listing', status: 'pending_review' }),
    };
    const db = {
      collection: jest.fn().mockImplementation((name: string) =>
        name === 'loanListings'
          ? { doc: () => ({ get: async () => listingSnapshot }) }
          : createAggregateCollection(),
      ),
    };
    const service = new LenderAdAnalyticsService({ getDb: () => db } as any);

    const result = await service.getAdAnalytics('lender_1', 'ad_1');

    expect(result.applications.total).toBe(0);
    expect(result.loans.funded).toBe(0);
    expect(result.fundingRate).toBe(0);
  });

  it('prevents a lender from reading another lender listing analytics', async () => {
    const listingSnapshot = {
      exists: true,
      get: () => 'lender_2',
      data: () => ({ lenderId: 'lender_2' }),
    };
    const db = {
      collection: jest.fn().mockReturnValue({
        doc: () => ({ get: async () => listingSnapshot }),
      }),
    };
    const service = new LenderAdAnalyticsService({ getDb: () => db } as any);

    await expect(
      service.getAdAnalytics('lender_1', 'ad_1'),
    ).rejects.toThrow('You can only view analytics for your own lender ads.');
  });
});
