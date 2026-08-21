import * as firestoreQueryUtils from '../../../firebase/firestore-query.utils';
import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { LenderAdsService } from './lender-ads.service';

function createDoc(id: string, data: Record<string, unknown>) {
  return {
    id,
    data: () => data,
    get: (field: string) => data[field],
  } as any;
}

describe('LenderAdsService', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('rejects advertisement submission until lender KYC is approved', async () => {
    const db = {
      collection: jest.fn((name: string) => {
        if (name === 'users') {
          return {
            doc: jest.fn(() => ({
              get: jest.fn().mockResolvedValue({
                exists: true,
                data: () => ({
                  accountStatus: 'active',
                  kycStatus: 'pending',
                  fullName: 'Pending Lender',
                }),
              }),
            })),
          };
        }
        return { doc: jest.fn() };
      }),
    };
    const service = new LenderAdsService(
      { getDb: () => db } as any,
      { create: jest.fn() } as any,
      { getCountsForAds: jest.fn() } as any,
    );

    await expect(
      service.createAd('lender_1', {
        headline: 'Responsible business lending',
        minAmount: 100000,
        maxAmount: 500000,
        interestRate: 12,
        tenureMonths: 12,
        borrowerFocus: 'Verified small business owners',
        processingTime: 'Within 2 business days',
        repaymentStyle: 'Monthly installments',
        requirements: 'Approved KYC and income documents',
        supportNote: 'Clear monthly financing for established businesses.',
      }),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('stores canonical mobile fields and succeeds when notification delivery fails', async () => {
    const setListing = jest.fn().mockResolvedValue(undefined);
    const listingRef = { id: 'ad_new', set: setListing };
    const db = {
      collection: jest.fn((name: string) => {
        if (name === 'users') {
          return {
            doc: jest.fn(() => ({
              get: jest.fn().mockResolvedValue({
                exists: true,
                data: () => ({
                  accountStatus: 'active',
                  kycStatus: 'approved',
                  fullName: 'Verified Lender',
                }),
              }),
            })),
          };
        }

        return { doc: jest.fn(() => listingRef) };
      }),
    };
    const notificationWriter = {
      create: jest
        .fn()
        .mockRejectedValue(new Error('notification unavailable')),
    };
    const service = new LenderAdsService(
      { getDb: () => db } as any,
      notificationWriter as any,
      {} as any,
    );

    const result = await service.createAd('lender_1', {
      headline: 'Responsible business lending',
      minAmount: 100000,
      maxAmount: 500000,
      interestRate: 12,
      minTenureMonths: 6,
      tenureMonths: 12,
      borrowerFocus: 'business, education',
      preferredPurposes: ['business', 'education'],
      processingTime: 'Reviewed within 36 hours',
      responseTimeHours: 36,
      repaymentStyle: 'Monthly installments',
      requirements: 'Approved KYC and income documents',
      supportNote: 'Clear monthly financing for established businesses.',
    });

    expect(result.adId).toBe('ad_new');
    expect(result.status).toBe('pending_review');
    expect(result.responseTimeHours).toBe(36);
    expect(setListing).toHaveBeenCalledWith(
      expect.objectContaining({
        purposeCategories: ['business', 'education'],
        responseTimeHours: 36,
        status: 'pending_review',
      }),
    );
    expect(notificationWriter.create).toHaveBeenCalledTimes(1);
  });

  it('rejects an invalid response-time value before writing an ad', async () => {
    const service = new LenderAdsService({} as any, {} as any, {} as any);

    expect(() =>
      (service as any).validateCreateInput({
        headline: 'Responsible business lending',
        minAmount: 100000,
        maxAmount: 500000,
        interestRate: 12,
        tenureMonths: 12,
        borrowerFocus: 'Verified business owners',
        processingTime: 'Reviewed within 200 hours',
        responseTimeHours: 200,
        repaymentStyle: 'Monthly installments',
        requirements: 'Approved KYC and income documents',
        supportNote: 'Clear monthly financing for established businesses.',
      }),
    ).toThrow(BadRequestException);
  });

  it('returns paginated ads from the canonical loan listings collection', async () => {
    const query = {
      limit: jest.fn().mockReturnValue({
        get: jest.fn().mockResolvedValue({
          docs: [
            createDoc('ad_1', {
              listingId: 'ad_1',
              lenderId: 'lender_1',
              title: 'Ad one',
              maxAmountMinor: 10000000,
              minInterestRateAnnual: 12,
              maxTenureMonths: 12,
              status: 'approved',
              createdAt: '2026-04-20T00:00:00.000Z',
            }),
            createDoc('ad_2', {
              listingId: 'ad_2',
              lenderId: 'lender_1',
              title: 'Ad two',
              maxAmountMinor: 12000000,
              minInterestRateAnnual: 14,
              maxTenureMonths: 18,
              status: 'active',
              createdAt: '2026-04-19T00:00:00.000Z',
            }),
            createDoc('ad_3', {
              listingId: 'ad_3',
              lenderId: 'lender_1',
              title: 'Ad three',
              maxAmountMinor: 14000000,
              minInterestRateAnnual: 16,
              maxTenureMonths: 24,
              status: 'active',
              createdAt: '2026-04-18T00:00:00.000Z',
            }),
          ],
        }),
      }),
    };
    const listings = { where: jest.fn().mockReturnValue(query) };
    const db = {
      collection: jest.fn().mockReturnValue(listings),
    };
    const firebaseService = { getDb: () => db } as any;
    const notificationWriter = { create: jest.fn() } as any;
    const analyticsService = {
      getCountsForAds: jest.fn().mockResolvedValue(
        new Map([
          ['ad_1', { applicationCount: 2, fundedLoansCount: 1 }],
          ['ad_2', { applicationCount: 2, fundedLoansCount: 1 }],
        ]),
      ),
    } as any;
    const service = new LenderAdsService(
      firebaseService,
      notificationWriter,
      analyticsService,
    );

    jest
      .spyOn(firestoreQueryUtils, 'orderByDateAndId')
      .mockReturnValue(query as never);
    jest
      .spyOn(firestoreQueryUtils, 'applyDateCursor')
      .mockReturnValue(query as never);

    const result = await service.getAdsForLender('lender_1', 2);

    expect(db.collection).toHaveBeenCalledWith('loanListings');
    expect(result.ads).toHaveLength(2);
    expect(result.ads[0].status).toBe('active');
    expect(result.ads[0].applicationCount).toBe(2);
    expect(result.ads[0].fundedLoansCount).toBe(1);
    expect(result.pageInfo.hasMore).toBe(true);
    expect(result.pageInfo.nextCursor).toBeTruthy();
  });

  it('falls back to lender-scoped in-memory ordering while the index builds', async () => {
    const missingIndexError = {
      code: 9,
      details: 'The query requires an index.',
    };
    const indexedQuery = {
      limit: jest.fn().mockReturnValue({
        get: jest.fn().mockRejectedValue(missingIndexError),
      }),
    };
    const unindexedQuery = {
      get: jest.fn().mockResolvedValue({
        docs: [
          createDoc('ad_old', {
            lenderId: 'lender_1',
            title: 'Older ad',
            createdAt: '2026-04-18T00:00:00.000Z',
          }),
          createDoc('ad_new', {
            lenderId: 'lender_1',
            title: 'Newer ad',
            createdAt: '2026-04-20T00:00:00.000Z',
          }),
          createDoc('ad_middle', {
            lenderId: 'lender_1',
            title: 'Middle ad',
            createdAt: '2026-04-19T00:00:00.000Z',
          }),
        ],
      }),
    };
    const where = jest.fn().mockReturnValue(unindexedQuery);
    const listings = { where };
    const db = { collection: jest.fn().mockReturnValue(listings) };
    const service = new LenderAdsService(
      { getDb: () => db } as any,
      { create: jest.fn() } as any,
      { getCountsForAds: jest.fn().mockResolvedValue(new Map()) } as any,
    );

    jest
      .spyOn(firestoreQueryUtils, 'orderByDateAndId')
      .mockReturnValue(indexedQuery as never);
    jest
      .spyOn(firestoreQueryUtils, 'applyDateCursor')
      .mockReturnValue(indexedQuery as never);

    const result = await service.getAdsForLender('lender_1', 2);

    expect(result.ads.map((ad) => ad.id)).toEqual(['ad_new', 'ad_middle']);
    expect(result.pageInfo.hasMore).toBe(true);
    expect(result.pageInfo.nextCursor).toBeTruthy();
    expect(where).toHaveBeenCalledWith('lenderId', '==', 'lender_1');
  });

  it('maps the inactive filter to every non-public advertisement status', () => {
    const service = new LenderAdsService({} as any, {} as any, {} as any);

    expect((service as any).normalizeStatusFilter('inactive')).toEqual([
      'draft',
      'paused',
      'rejected',
      'expired',
      'closed',
    ]);
  });

  it('rejects unsupported advertisement status filters', () => {
    const service = new LenderAdsService({} as any, {} as any, {} as any);

    expect(() =>
      (service as any).normalizeStatusFilter('not-a-status'),
    ).toThrow(BadRequestException);
  });
});
