import * as firestoreQueryUtils from '../../../firebase/firestore-query.utils';
import { LoanRequestsService } from './loan-requests.service';

function createDoc(id: string, data: Record<string, unknown>) {
  return {
    id,
    data: () => data,
    get: (field: string) => data[field],
  } as any;
}

describe('LoanRequestsService', () => {
  it('returns only lender-visible paginated requests and preserves page metadata', async () => {
    const adDoc = createDoc('ad_1', { title: 'Targeted ad' });
    const borrowerSnapshot = {
      id: 'borrower_1',
      data: () => ({
        fullName: 'Borrower One',
        email: 'borrower@example.com',
        phone: '+94770000000',
        creditScore: 710,
        kycStatus: 'approved',
      }),
    } as any;
    const db = {
      collection: jest.fn((name: string) => {
        if (name === 'ads') {
          return {
            where: jest.fn().mockReturnValue({
              get: jest.fn().mockResolvedValue({ docs: [adDoc] }),
            }),
          };
        }

        if (name === 'users') {
          return {
            doc: jest.fn().mockReturnValue({ id: 'borrower_1' }),
          };
        }

        return {};
      }),
      getAll: jest.fn().mockResolvedValue([borrowerSnapshot]),
    };
    const firebaseService = { getDb: () => db } as any;
    const service = new LoanRequestsService(firebaseService);

    jest
      .spyOn(firestoreQueryUtils, 'scanQueryPage')
      .mockImplementation(async ({ mapDoc }) => {
        const visible = await mapDoc(
          createDoc('req_1', {
            requestId: 'req_1',
            borrowerId: 'borrower_1',
            adId: 'ad_1',
            amount: 50000,
            tenureMonths: 12,
            purpose: 'business',
            status: 'open',
            urgency: 'high',
            createdAt: '2026-04-21T00:00:00.000Z',
          }),
        );
        const hidden = await mapDoc(
          createDoc('req_2', {
            requestId: 'req_2',
            borrowerId: 'borrower_2',
            adId: 'ad_other',
            amount: 60000,
            tenureMonths: 10,
            purpose: 'medical',
            status: 'open',
            createdAt: '2026-04-20T00:00:00.000Z',
          }),
        );

        return {
          items: [visible, hidden].filter(Boolean) as any[],
          exhausted: true,
        };
      });

    const result = await service.getPendingRequests('lender_1', 10, null, false);

    expect(result.requests).toHaveLength(1);
    expect(result.requests[0]).toMatchObject({
      requestId: 'req_1',
      borrowerName: 'Borrower One',
      targetType: 'targeted',
      adTitle: 'Targeted ad',
    });
    expect(result.pageInfo.hasMore).toBe(false);
    expect(result.summary.totalPendingRequests).toBe(1);
  });

  it('returns ad-linked requests with accepted status when all statuses are requested', async () => {
    const adDoc = createDoc('ad_1', { title: 'Targeted ad' });
    const borrowerSnapshot = {
      id: 'borrower_1',
      data: () => ({
        fullName: 'Borrower One',
        email: 'borrower@example.com',
        phone: '+94770000000',
        creditScore: 710,
        kycStatus: 'approved',
      }),
    } as any;
    const db = {
      collection: jest.fn((name: string) => {
        if (name === 'ads') {
          return {
            where: jest.fn().mockReturnValue({
              get: jest.fn().mockResolvedValue({ docs: [adDoc] }),
            }),
          };
        }

        if (name === 'users') {
          return {
            doc: jest.fn().mockReturnValue({ id: 'borrower_1' }),
          };
        }

        return {};
      }),
      getAll: jest.fn().mockResolvedValue([borrowerSnapshot]),
    };
    const firebaseService = { getDb: () => db } as any;
    const service = new LoanRequestsService(firebaseService);

    jest
      .spyOn(firestoreQueryUtils, 'scanQueryPage')
      .mockImplementationOnce(async ({ mapDoc }) => {
        const accepted = await mapDoc(
          createDoc('req_1', {
            requestId: 'req_1',
            borrowerId: 'borrower_1',
            adId: 'ad_1',
            amount: 50000,
            tenureMonths: 12,
            purpose: 'business',
            status: 'accepted',
            urgency: 'high',
            createdAt: '2026-04-21T00:00:00.000Z',
          }),
        );

        return {
          items: [accepted].filter(Boolean) as any[],
          exhausted: true,
        };
      });

    const result = await service.getPendingRequests(
      'lender_1',
      10,
      null,
      false,
      'ad_1',
      true,
    );

    expect(result.requests).toHaveLength(1);
    expect(result.requests[0]).toMatchObject({
      requestId: 'req_1',
      status: 'accepted',
      adId: 'ad_1',
      adTitle: 'Targeted ad',
    });
  });
});
