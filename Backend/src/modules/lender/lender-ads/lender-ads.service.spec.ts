import * as firestoreQueryUtils from '../../../firebase/firestore-query.utils';
import { LenderAdsService } from './lender-ads.service';

function createDoc(id: string, data: Record<string, unknown>) {
  return {
    id,
    data: () => data,
    get: (field: string) => data[field],
  } as any;
}

describe('LenderAdsService', () => {
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
    const db = {
      collection: jest.fn().mockReturnValue({
        where: jest.fn().mockReturnValue(query),
      }),
    };
    const firebaseService = { getDb: () => db } as any;
    const notificationWriter = { create: jest.fn() } as any;
    const service = new LenderAdsService(firebaseService, notificationWriter);

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
    expect(result.pageInfo.hasMore).toBe(true);
    expect(result.pageInfo.nextCursor).toBeTruthy();
  });
});
