import { AdminAdApprovalService } from './admin-ad_approval.service';
import { FirebaseService } from '../../firebase/firebase.service';

describe('AdminAdApprovalService', () => {
  const limitGet = jest.fn();
  const limit = jest.fn(() => ({ get: limitGet }));
  const orderBy = jest.fn(() => ({ limit }));
  const collectionGet = jest.fn();
  const collection = jest.fn(() => ({ orderBy, get: collectionGet }));
  const firebaseService = { db: { collection } } as unknown as FirebaseService;
  let service: AdminAdApprovalService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new AdminAdApprovalService(firebaseService);
  });

  it('returns the paginated admin contract and maps canonical listing fields', async () => {
    limitGet.mockResolvedValue({
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
    expect(response).toMatchObject({ success: true, count: 1, hasMore: false });
    expect(response.ads[0]).toMatchObject({
      id: 'listing-1',
      status: 'pending',
      maxAmount: 25000,
      preferredInterestRate: 12,
      preferredPurposes: ['education'],
    });
  });

  it('normalizes canonical statuses for the admin summary', async () => {
    collectionGet.mockResolvedValue({
      size: 5,
      docs: [
        { data: () => ({ status: 'pending_review' }) },
        { data: () => ({ status: 'active' }) },
        { data: () => ({ status: 'rejected' }) },
        { data: () => ({ status: 'expired' }) },
        { data: () => ({ status: 'approved' }) },
      ],
    });

    await expect(service.getAdStats()).resolves.toEqual({
      success: true,
      stats: {
        all: 5,
        active: 1,
        approved: 1,
        pending: 1,
        rejected: 1,
        closed: 1,
      },
    });
  });
});
