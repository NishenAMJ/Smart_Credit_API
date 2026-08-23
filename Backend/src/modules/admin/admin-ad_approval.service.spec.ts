import { AdminAdApprovalService } from './admin-ad_approval.service';
import { FirebaseService } from '../../firebase/firebase.service';

describe('AdminAdApprovalService', () => {
  const get = jest.fn();
  const limit = jest.fn();
  const orderBy = jest.fn();
  const where = jest.fn();
  const countGet = jest.fn();
  const count = jest.fn(() => ({ get: countGet }));
  const query = { get, limit, orderBy, where, count };
  const collection = jest.fn(() => query);
  const firebaseService = { db: { collection } } as unknown as FirebaseService;
  let service: AdminAdApprovalService;

  beforeEach(() => {
    jest.clearAllMocks();
    limit.mockReturnValue(query);
    orderBy.mockReturnValue(query);
    where.mockReturnValue(query);
    service = new AdminAdApprovalService(firebaseService);
  });

  it('returns a bounded page and maps canonical listing fields', async () => {
    get.mockResolvedValue({
      size: 1,
      docs: [
        {
          id: 'listing-1',
          data: () => ({
            listingId: 'listing-1',
            lenderId: 'lender-1',
            status: 'pending_review',
            maxAmountMinor: 2500000,
            minInterestRateAnnual: 12,
            purposeCategories: ['education'],
          }),
        },
      ],
    });

    const response = await service.getAds('10');

    expect(collection).toHaveBeenCalledWith('loanListings');
    expect(limit).toHaveBeenCalledWith(11);
    expect(response).toMatchObject({ success: true, count: 1, hasMore: false });
    expect(response.ads[0]).toMatchObject({
      id: 'listing-1',
      status: 'pending',
      maxAmount: 25000,
      preferredInterestRate: 12,
      preferredPurposes: ['education'],
    });
  });

  it('uses count aggregations and never fetches listing documents for statistics', async () => {
    for (const value of [5, 2, 1, 1, 1]) {
      countGet.mockResolvedValueOnce({ data: () => ({ count: value }) });
    }

    const response = await service.getAdStats();

    expect(response.stats).toEqual({
      all: 5,
      active: 2,
      pending: 1,
      rejected: 1,
      closed: 1,
    });
    expect(count).toHaveBeenCalledTimes(5);
    expect(get).not.toHaveBeenCalled();
  });

  it('maps legacy approved ads into the active status', async () => {
    get.mockResolvedValue({
      size: 1,
      docs: [
        {
          id: 'listing-legacy',
          data: () => ({ status: 'approved' }),
        },
      ],
    });

    const response = await service.getAds('10', undefined, 'active');

    expect(response.ads[0]).toMatchObject({
      id: 'listing-legacy',
      status: 'active',
    });
    expect(where).toHaveBeenCalledWith('status', 'in', [
      'active',
      'approved',
    ]);
  });
});
