import { BadRequestException, ForbiddenException } from '@nestjs/common';
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
      db: {
        collection: jest.fn(() => ({ where, doc: jest.fn() })),
        getAll: jest.fn().mockResolvedValue([
          {
            id: 'borrower-1',
            exists: true,
            data: () => ({ fullName: 'Borrower One' }),
          },
          {
            id: 'lender-1',
            exists: true,
            data: () => ({ fullName: 'Lender One' }),
          },
        ]),
      },
    } as unknown as FirebaseService;
    const service = new DisputesService(firebase, gateway);

    const response = await service.getEligibleLoans('borrower-1', 'borrower');

    expect(where).toHaveBeenCalledWith('borrowerId', '==', 'borrower-1');
    expect(response.loans).toHaveLength(1);
    expect(response.loans[0]).toMatchObject({
      borrowerName: 'Borrower One',
      lenderName: 'Lender One',
    });
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

  it('creates a general dispute without a loan ID', async () => {
    const create = jest.fn();
    const disputeRef = {
      id: 'general-dispute-1',
      collection: jest.fn(() => ({
        doc: jest.fn(() => ({ id: 'event-1' })),
      })),
    };
    const duplicateQuery = {
      where: jest.fn(),
      limit: jest.fn(),
    } as any;
    duplicateQuery.where.mockReturnValue(duplicateQuery);
    duplicateQuery.limit.mockReturnValue(duplicateQuery);
    const firebase = {
      db: {
        collection: jest.fn((name: string) => {
          if (name === 'disputes') {
            return {
              doc: jest.fn(() => disputeRef),
              where: jest.fn(() => duplicateQuery),
            };
          }
          return { doc: jest.fn(), add: jest.fn() };
        }),
        getAll: jest.fn().mockResolvedValue([
          {
            id: 'borrower-1',
            exists: true,
            data: () => ({ fullName: 'Borrower One' }),
          },
        ]),
        runTransaction: jest.fn(async (handler) =>
          handler({
            get: jest.fn().mockResolvedValue({ empty: true }),
            create,
            update: jest.fn(),
          }),
        ),
      },
    } as unknown as FirebaseService;
    const service = new DisputesService(firebase, gateway);

    const response = await service.createDispute('borrower-1', 'borrower', {
      category: 'other',
      subject: 'Account access issue',
      description: 'I cannot access one of the platform features.',
      desiredOutcome: 'Please review my account.',
    });

    expect(response.dispute).toMatchObject({
      loanId: null,
      borrowerId: 'borrower-1',
      lenderId: '',
      respondentId: '',
    });
    expect(create).toHaveBeenCalledWith(
      disputeRef,
      expect.objectContaining({ loanId: null, complainantId: 'borrower-1' }),
    );
  });

  it('requires a loan when a transaction ID is supplied', async () => {
    const firebase = {
      db: {
        collection: jest.fn(),
      },
    } as unknown as FirebaseService;
    const service = new DisputesService(firebase, gateway);

    await expect(
      service.createDispute('borrower-1', 'borrower', {
        transactionId: 'transaction-1',
        category: 'payment',
        subject: 'Payment issue',
        description: 'The payment does not appear in my account.',
        desiredOutcome: 'Please review the payment.',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
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

  it('moves an open dispute into review when the admin opens it', async () => {
    const now = Timestamp.now();
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
    const eventRef = { id: 'event-1' };
    const disputeRef = {
      get: jest.fn().mockResolvedValue({
        exists: true,
        id: 'dispute-1',
        data: () => disputeData,
      }),
      collection: jest.fn(() => ({ doc: jest.fn(() => eventRef) })),
    };
    const update = jest.fn();
    const create = jest.fn();
    const setAudit = jest.fn().mockResolvedValue(undefined);
    const firebase = {
      db: {
        collection: jest.fn((name: string) =>
          name === 'disputes'
            ? { doc: jest.fn(() => disputeRef) }
            : { doc: jest.fn(() => ({ id: 'audit-1', set: setAudit })) },
        ),
        runTransaction: jest.fn(async (handler) =>
          handler({
            get: jest.fn().mockResolvedValue({
              exists: true,
              id: 'dispute-1',
              data: () => disputeData,
            }),
            update,
            create,
          }),
        ),
      },
    } as unknown as FirebaseService;
    const service = new DisputesService(firebase, gateway);

    const response = await service.startReview('dispute-1', 'admin-1');

    expect(response.dispute.status).toBe('under_review');
    expect(update).toHaveBeenCalledWith(
      disputeRef,
      expect.objectContaining({ status: 'under_review' }),
    );
    expect(create).toHaveBeenCalledWith(
      eventRef,
      expect.objectContaining({
        type: 'review_started',
        previousStatus: 'open',
        nextStatus: 'under_review',
      }),
    );
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

  it('queries active participant disputes before applying pagination', async () => {
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

    await service.getMyDisputes(
      'lender-1',
      undefined,
      '10',
      undefined,
      'lender',
      'active',
    );

    expect(query.where).toHaveBeenCalledWith('status', 'in', [
      'open',
      'under_review',
      'awaiting_response',
      'escalated',
    ]);
    expect(query.limit).toHaveBeenCalledWith(11);
  });

  it('returns an awaiting-response case to review after a participant reply', async () => {
    const now = Timestamp.now();
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
      status: 'awaiting_response',
      createdAt: now,
      updatedAt: now,
    };
    const eventRef = { id: 'event-1' };
    const disputeRef = {
      get: jest.fn().mockResolvedValue({
        exists: true,
        id: 'dispute-1',
        data: () => disputeData,
      }),
      collection: jest.fn(() => ({ doc: jest.fn(() => eventRef) })),
    };
    const update = jest.fn();
    const create = jest.fn();
    const add = jest.fn().mockResolvedValue({ id: 'notification-1' });
    const firebase = {
      db: {
        collection: jest.fn((name: string) =>
          name === 'disputes'
            ? { doc: jest.fn(() => disputeRef) }
            : { add, doc: jest.fn() },
        ),
        runTransaction: jest.fn(async (handler) => handler({ update, create })),
      },
    } as unknown as FirebaseService;
    const service = new DisputesService(firebase, gateway);

    await service.addComment('dispute-1', 'lender-1', 'lender', {
      message: 'The requested receipt has now been attached.',
      documentIds: [],
    });

    expect(update).toHaveBeenCalledWith(
      disputeRef,
      expect.objectContaining({ status: 'under_review' }),
    );
    expect(create).toHaveBeenCalledWith(
      eventRef,
      expect.objectContaining({
        previousStatus: 'awaiting_response',
        nextStatus: 'under_review',
      }),
    );
  });

  it('treats repeated resolution acknowledgement as idempotent', async () => {
    const now = Timestamp.now();
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
      status: 'resolved',
      acknowledgements: { 'lender-1': now },
      resolution: {
        summary: 'Resolved.',
        recommendedActions: [],
        issuedByAdminId: 'admin-1',
        issuedAt: now,
        reopenUntil: Timestamp.fromMillis(now.toMillis() + 60_000),
      },
      createdAt: now,
      updatedAt: now,
      resolvedAt: now,
    };
    const disputeRef = {
      collection: jest.fn(() => ({
        doc: jest.fn(() => ({ id: 'event-1' })),
      })),
    };
    const update = jest.fn();
    const create = jest.fn();
    const firebase = {
      db: {
        collection: jest.fn(() => ({ doc: jest.fn(() => disputeRef) })),
        runTransaction: jest.fn(async (handler) =>
          handler({
            get: jest.fn().mockResolvedValue({
              exists: true,
              id: 'dispute-1',
              data: () => disputeData,
            }),
            update,
            create,
          }),
        ),
      },
    } as unknown as FirebaseService;
    const service = new DisputesService(firebase, gateway);

    const response = await service.acknowledge(
      'dispute-1',
      'lender-1',
      'lender',
    );

    expect(response.dispute.status).toBe('resolved');
    expect(update).not.toHaveBeenCalled();
    expect(create).not.toHaveBeenCalled();
  });

  it('does not allow a closed dispute priority to be changed', async () => {
    const now = Timestamp.now();
    const disputeRef = {
      get: jest.fn().mockResolvedValue({
        exists: true,
        id: 'dispute-1',
        data: () => ({
          disputeId: 'dispute-1',
          loanId: 'loan-1',
          borrowerId: 'borrower-1',
          lenderId: 'lender-1',
          complainantId: 'borrower-1',
          respondentId: 'lender-1',
          category: 'payment',
          status: 'closed',
          createdAt: now,
          updatedAt: now,
        }),
      }),
    };
    const firebase = {
      db: {
        collection: jest.fn(() => ({ doc: jest.fn(() => disputeRef) })),
      },
    } as unknown as FirebaseService;
    const service = new DisputesService(firebase, gateway);

    await expect(
      service.changePriority('dispute-1', 'admin-1', 'high', 'New priority'),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});
