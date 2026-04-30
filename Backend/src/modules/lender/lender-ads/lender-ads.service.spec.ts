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
  it('returns paginated ads from the ads collection and normalizes seeded status', async () => {
    const query = {
      limit: jest.fn().mockReturnValue({
        get: jest.fn().mockResolvedValue({
          docs: [
            createDoc('ad_1', {
              adId: 'ad_1',
              lenderId: 'lender_1',
              title: 'Ad one',
              maxAmount: 100000,
              preferredInterestRate: 12,
              maxTenureMonths: 12,
              status: 'approved',
              createdAt: '2026-04-20T00:00:00.000Z',
            }),
            createDoc('ad_2', {
              adId: 'ad_2',
              lenderId: 'lender_1',
              title: 'Ad two',
              maxAmount: 120000,
              preferredInterestRate: 14,
              maxTenureMonths: 18,
              status: 'active',
              createdAt: '2026-04-19T00:00:00.000Z',
            }),
            createDoc('ad_3', {
              adId: 'ad_3',
              lenderId: 'lender_1',
              title: 'Ad three',
              maxAmount: 140000,
              preferredInterestRate: 16,
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
    const notificationsService = { createNotification: jest.fn() } as any;
    const service = new LenderAdsService(firebaseService, notificationsService);

    jest.spyOn(firestoreQueryUtils, 'orderByDateAndId').mockReturnValue(query as never);
    jest.spyOn(firestoreQueryUtils, 'applyDateCursor').mockReturnValue(query as never);

    const result = await service.getAdsForLender('lender_1', 2);

    expect(db.collection).toHaveBeenCalledWith('ads');
    expect(result.ads).toHaveLength(2);
    expect(result.ads[0].status).toBe('active');
    expect(result.pageInfo.hasMore).toBe(true);
    expect(result.pageInfo.nextCursor).toBeTruthy();
  });
});
