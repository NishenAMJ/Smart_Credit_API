import { ForbiddenException } from '@nestjs/common';
import { Timestamp } from 'firebase-admin/firestore';
import { FirebaseService } from '../../firebase/firebase.service';
import { ChatGateway } from '../chat/gateway/chat.gateway';
import { DisputesService } from './disputes.service';

describe('DisputesService', () => {
  const gateway = {
    emitToUser: jest.fn(),
    emitToRole: jest.fn(),
  } as unknown as ChatGateway;

  it('lists only loans belonging to the authenticated role', async () => {
    const where = jest.fn(() => ({
      get: jest.fn().mockResolvedValue({
        docs: [
          {
            id: 'loan-1',
            data: () => ({
              loanId: 'loan-1',
              borrowerId: 'borrower-1',
              lenderId: 'lender-1',
              status: 'active',
            }),
          },
        ],
      }),
    }));
    const firebase = {
      db: { collection: jest.fn(() => ({ where })) },
    } as unknown as FirebaseService;
    const service = new DisputesService(firebase, gateway);

    const response = await service.getEligibleLoans('borrower-1', 'borrower');

    expect(where).toHaveBeenCalledWith('borrowerId', '==', 'borrower-1');
    expect(response.loans).toHaveLength(1);
  });

  it('rejects a borrower attempting to dispute another user loan', async () => {
    const firebase = {
      db: {
        collection: jest.fn((name: string) => ({
          doc: jest.fn(() => ({
            get: jest.fn().mockResolvedValue(
              name === 'loans'
                ? {
                    exists: true,
                    data: () => ({
                      borrowerId: 'borrower-owner',
                      lenderId: 'lender-1',
                    }),
                  }
                : { exists: false },
            ),
          })),
        })),
      },
    } as unknown as FirebaseService;
    const service = new DisputesService(firebase, gateway);

    await expect(
      service.createDispute('borrower-attacker', 'borrower', {
        loanId: 'loan-1',
        category: 'payment',
        subject: 'Wrong payment',
        description: 'This payment record is not correct.',
        desiredOutcome: 'Please correct it.',
      }),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('hides private admin timeline notes from participants', async () => {
    const now = Timestamp.now();
    const eventsGet = jest.fn().mockResolvedValue({
      docs: [
        {
          id: 'shared',
          data: () => ({
            eventId: 'shared',
            visibility: 'shared',
            message: 'Visible update',
            createdAt: now,
          }),
        },
        {
          id: 'private',
          data: () => ({
            eventId: 'private',
            visibility: 'admin',
            message: 'Internal note',
            createdAt: now,
          }),
        },
      ],
    });
    const disputeData = {
      disputeId: 'dispute-1',
      loanId: 'loan-1',
      complainantId: 'borrower-1',
      complainantRole: 'borrower',
      respondentId: 'lender-1',
      respondentRole: 'lender',
      borrowerId: 'borrower-1',
      lenderId: 'lender-1',
      category: 'payment',
      status: 'open',
      createdAt: now,
      updatedAt: now,
    };
    const firebase = {
      db: {
        collection: jest.fn(() => ({
          doc: jest.fn(() => ({
            get: jest.fn().mockResolvedValue({
              exists: true,
              id: 'dispute-1',
              data: () => disputeData,
            }),
            collection: jest.fn(() => ({
              orderBy: jest.fn(() => ({ get: eventsGet })),
            })),
          })),
        })),
      },
    } as unknown as FirebaseService;
    const service = new DisputesService(firebase, gateway);

    const response = await service.getEvents(
      'dispute-1',
      'borrower-1',
      'borrower',
    );

    expect(response.events.map((event) => event.id)).toEqual(['shared']);
  });

  it('applies admin filters and a page limit before reading documents', async () => {
    const get = jest.fn().mockResolvedValue({ size: 0, docs: [] });
    const query = {
      where: jest.fn(),
      orderBy: jest.fn(),
      limit: jest.fn(),
      get,
    };
    query.where.mockReturnValue(query);
    query.orderBy.mockReturnValue(query);
    query.limit.mockReturnValue(query);
    const firebase = {
      db: { collection: jest.fn(() => query) },
    } as unknown as FirebaseService;
    const service = new DisputesService(firebase, gateway);

    const response = await service.getAllDisputes('10', undefined, {
      status: 'open',
      priority: 'high',
      search: 'DSP-123',
    });

    expect(query.where).toHaveBeenCalledWith('status', '==', 'open');
    expect(query.where).toHaveBeenCalledWith('priority', '==', 'high');
    expect(query.where).toHaveBeenCalledWith(
      'searchTokens',
      'array-contains',
      'dsp-123',
    );
    expect(query.orderBy).toHaveBeenCalledWith('updatedAt', 'desc');
    expect(query.limit).toHaveBeenCalledWith(11);
    expect(get).toHaveBeenCalledTimes(1);
    expect(response).toMatchObject({ count: 0, hasMore: false });
  });

  it('uses count aggregations instead of dispute snapshots for statistics', async () => {
    const get = jest.fn();
    for (const value of [9, 2, 2, 1, 1, 2, 1]) {
      get.mockResolvedValueOnce({ data: () => ({ count: value }) });
    }
    const count = jest.fn(() => ({ get }));
    const query = { where: jest.fn(), count };
    query.where.mockReturnValue(query);
    const firebase = {
      db: { collection: jest.fn(() => query) },
    } as unknown as FirebaseService;
    const service = new DisputesService(firebase, gateway);

    const response = await service.getStats();

    expect(count).toHaveBeenCalledTimes(7);
    expect(response.stats).toEqual({
      all: 9,
      open: 2,
      under_review: 2,
      awaiting_response: 1,
      escalated: 1,
      resolved: 2,
      closed: 1,
    });
  });

  it('bounds participant dispute lists before reading documents', async () => {
    const get = jest.fn().mockResolvedValue({ size: 0, docs: [] });
    const query = {
      where: jest.fn(),
      orderBy: jest.fn(),
      limit: jest.fn(),
      get,
    };
    query.where.mockReturnValue(query);
    query.orderBy.mockReturnValue(query);
    query.limit.mockReturnValue(query);
    const firebase = {
      db: { collection: jest.fn(() => query) },
    } as unknown as FirebaseService;
    const service = new DisputesService(firebase, gateway);

    await service.getMyDisputes('lender-1', 'open', '10', undefined, 'lender');

    expect(query.where).toHaveBeenCalledWith('lenderId', '==', 'lender-1');
    expect(query.where).toHaveBeenCalledWith('status', '==', 'open');
    expect(query.orderBy).toHaveBeenCalledWith('updatedAt', 'desc');
    expect(query.limit).toHaveBeenCalledWith(11);
    expect(get).toHaveBeenCalledTimes(1);
  });
});
