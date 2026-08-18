import { LenderOffersService } from './lender_offers.service';

describe('LenderOffersService', () => {
  it('delegates mobile offer creation to the canonical lender ads service', async () => {
    const lenderAdsService = {
      createAd: jest.fn().mockResolvedValue({
        id: 'listing_1',
        adId: 'listing_1',
        lenderId: 'lender_1',
        title: 'Education financing offer',
        description: '',
        minAmount: 50000,
        maxAmount: 100000,
        preferredInterestRate: 12,
        maxTenureMonths: 12,
        location: '',
        preferredPurposes: ['Education'],
        status: 'pending_review',
        isBoosted: false,
        availableCapital: 100000,
        applicationCount: 0,
        fundedLoansCount: 0,
        responseTimeHours: 24,
        lenderName: null,
        expiresAt: null,
        createdAt: '2026-01-01T00:00:00.000Z',
        updatedAt: '2026-01-01T00:00:00.000Z',
        searchKeywords: [],
        seedBatchId: '',
        source: 'loanListings',
      }),
    } as any;
    const service = new LenderOffersService(lenderAdsService);

    const result = await service.createOffer('lender_1', {
      loanType: 'Education',
      minAmount: 50000,
      maxAmount: 100000,
      interestRate: 12,
      tenureMonths: 12,
    });

    expect(lenderAdsService.createAd).toHaveBeenCalledWith(
      'lender_1',
      expect.objectContaining({ minAmount: 50000 }),
    );
    expect(result.id).toBe('listing_1');
    expect(result.status).toBe('pending_review');
  });
});
