import * as firestoreQueryUtils from '../../../firebase/firestore-query.utils';
import { LoanRequestsService } from './loan-requests.service';

function createDoc(id: string, data: Record<string, unknown>) {
  return {
    id,
    data: () => data,
    get: (field: string) => data[field],
  } as any;
}

function createLoanRequestQuery(docs: any[], shouldReject = false) {
  return {
    where: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    get: jest.fn().mockImplementation(async () => {
      if (shouldReject) {
        throw new Error('loan request query failed');
      }

      return { docs };
    }),
  };
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

        if (name === 'loanRequests') {
          return createLoanRequestQuery([
            createDoc('req_1', {
              requestId: 'req_1',
              borrowerId: 'borrower_1',
              adId: 'ad_1',
              amount: 50000,
              tenureMonths: 12,
              purpose: 'business',
              purposeCategory: 'business',
              status: 'open',
              suggestedInterestRate: 14,
              urgency: 'high',
              monthlyIncome: 120000,
              incomeSource: 'salary',
              requestedRegion: 'Colombo',
              collateralOffered: false,
              matchedLenderIds: ['lender_1'],
              notes: 'seeded request',
              createdAt: '2026-04-21T00:00:00.000Z',
              updatedAt: '2026-04-21T00:00:00.000Z',
            }),
            createDoc('req_2', {
              requestId: 'req_2',
              borrowerId: 'borrower_2',
              adId: 'ad_other',
              amount: 60000,
              tenureMonths: 10,
              purpose: 'medical',
              purposeCategory: 'medical',
              status: 'open',
              suggestedInterestRate: 15,
              urgency: 'medium',
              monthlyIncome: 100000,
              incomeSource: 'salary',
              requestedRegion: 'Kandy',
              collateralOffered: false,
              matchedLenderIds: [],
              notes: '',
              createdAt: '2026-04-20T00:00:00.000Z',
              updatedAt: '2026-04-20T00:00:00.000Z',
            }),
          ]);
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

    expect(result.requests).toHaveLength(2);
    expect(result.requests[0]).toMatchObject({
      requestId: 'req_1',
      borrowerName: 'Borrower One',
      targetType: 'targeted',
      adTitle: 'Targeted ad',
    });
    expect(result.requests[1]).toMatchObject({
      requestId: 'req_2',
      borrowerName: 'Unknown borrower',
      targetType: 'targeted',
    });
    expect(result.pageInfo.hasMore).toBe(false);
    expect(result.summary.totalPendingRequests).toBe(2);
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

        if (name === 'loanRequests') {
          return createLoanRequestQuery([
            createDoc('req_1', {
              requestId: 'req_1',
              borrowerId: 'borrower_1',
              adId: 'ad_1',
              amount: 50000,
              tenureMonths: 12,
              purpose: 'business',
              purposeCategory: 'business',
              status: 'accepted',
              suggestedInterestRate: 14,
              urgency: 'high',
              monthlyIncome: 120000,
              incomeSource: 'salary',
              requestedRegion: 'Colombo',
              collateralOffered: false,
              matchedLenderIds: ['lender_1'],
              notes: 'seeded request',
              createdAt: '2026-04-21T00:00:00.000Z',
              updatedAt: '2026-04-21T00:00:00.000Z',
            }),
          ]);
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

  it('falls back when lender ad lookup fails and still returns pending requests', async () => {
    const request = createDoc('req_1', {
      requestId: 'req_1',
      borrowerId: 'borrower_1',
      adId: 'ad_1',
      targetLenderId: 'lender_1',
      amount: 50000,
      tenureMonths: 12,
      purpose: 'business',
      purposeCategory: 'business',
      status: 'open',
      suggestedInterestRate: 14,
      urgency: 'high',
      monthlyIncome: 120000,
      incomeSource: 'salary',
      requestedRegion: 'Colombo',
      collateralOffered: false,
      matchedLenderIds: ['lender_1'],
      notes: 'seeded request',
      createdAt: '2026-04-21T00:00:00.000Z',
      updatedAt: '2026-04-21T00:00:00.000Z',
    });

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
              get: jest.fn().mockRejectedValue(new Error('ads lookup failed')),
            }),
          };
        }

        if (name === 'loanRequests') {
          return createLoanRequestQuery([request]);
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

    const service = new LoanRequestsService({ getDb: () => db } as any);

    jest.spyOn(service as any, 'buildSummary').mockResolvedValue({
      totalPendingRequests: 1,
      targetedRequests: 1,
      marketplaceMatches: 0,
      highUrgencyRequests: 1,
    });

    const result = await service.getPendingRequests('lender_1', 10, null, true);

    expect(result.requests).toHaveLength(1);
    expect(result.requests[0]).toMatchObject({
      requestId: 'req_1',
      borrowerName: 'Borrower One',
      adId: 'ad_1',
    });
  });

  it('approves a lender-visible request', async () => {
    const update = jest.fn().mockResolvedValue(undefined);
    const requestData: Record<string, unknown> = {
      requestId: 'req_1',
      borrowerId: 'borrower_1',
      adId: 'ad_1',
      targetLenderId: 'lender_1',
      status: 'open',
      matchedLenderIds: [],
      createdAt: '2026-04-21T00:00:00.000Z',
      updatedAt: '2026-04-21T00:00:00.000Z',
    };
    const requestSnapshot = {
      exists: true,
      id: 'req_1',
      data: () => requestData,
      get: (field: string) => requestData[field],
    } as any;
    const db = {
      collection: jest.fn((name: string) => {
        if (name === 'loanRequests') {
          return {
            doc: jest.fn(() => ({
              id: 'req_1',
              get: jest.fn().mockResolvedValue(requestSnapshot),
              update,
            })),
          };
        }

        if (name === 'ads') {
          return {
            where: jest.fn().mockReturnValue({
              get: jest.fn().mockResolvedValue({ docs: [createDoc('ad_1', {})] }),
            }),
          };
        }

        return {};
      }),
    };

    const service = new LoanRequestsService({ getDb: () => db } as any);

    const result = await service.approveRequest('lender_1', 'req_1', 'Looks good');

    expect(result.requestId).toBe('req_1');
    expect(result.status).toBe('approved');
    expect(update).toHaveBeenCalledWith(
      expect.objectContaining({
        status: 'approved',
        approvedByLenderId: 'lender_1',
        lenderDecisionNotes: 'Looks good',
      }),
    );
  });

  it('rejects a lender-visible request with a reason', async () => {
    const update = jest.fn().mockResolvedValue(undefined);
    const requestData: Record<string, unknown> = {
      requestId: 'req_1',
      borrowerId: 'borrower_1',
      adId: null,
      targetLenderId: 'lender_1',
      status: 'under_review',
      matchedLenderIds: [],
      createdAt: '2026-04-21T00:00:00.000Z',
      updatedAt: '2026-04-21T00:00:00.000Z',
    };
    const requestSnapshot = {
      exists: true,
      id: 'req_1',
      data: () => requestData,
      get: (field: string) => requestData[field],
    } as any;
    const db = {
      collection: jest.fn((name: string) => {
        if (name === 'loanRequests') {
          return {
            doc: jest.fn(() => ({
              id: 'req_1',
              get: jest.fn().mockResolvedValue(requestSnapshot),
              update,
            })),
          };
        }

        if (name === 'ads') {
          return {
            where: jest.fn().mockReturnValue({
              get: jest.fn().mockResolvedValue({ docs: [] }),
            }),
          };
        }

        return {};
      }),
    };

    const service = new LoanRequestsService({ getDb: () => db } as any);

    const result = await service.rejectRequest('lender_1', 'req_1', 'Income proof mismatch');

    expect(result.status).toBe('rejected');
    expect(update).toHaveBeenCalledWith(
      expect.objectContaining({
        status: 'rejected',
        rejectedByLenderId: 'lender_1',
        rejectionReason: 'Income proof mismatch',
      }),
    );
  });
});
