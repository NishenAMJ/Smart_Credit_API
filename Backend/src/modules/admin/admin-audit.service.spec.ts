import { Test, TestingModule } from '@nestjs/testing';
import { AdminAuditService } from './admin-audit.service';
import { FirebaseService } from '../../firebase/firebase.service';

function snapshot(docs: Array<{ id: string; data: Record<string, unknown> }>) {
  const snapshotDocs = docs.map((doc) => ({
    id: doc.id,
    data: () => doc.data,
  }));

  return {
    docs: snapshotDocs,
    forEach(
      callback: (doc: {
        id: string;
        data: () => Record<string, unknown>;
      }) => void,
    ) {
      snapshotDocs.forEach(callback);
    },
  };
}

describe('AdminAuditService', () => {
  let service: AdminAuditService;
  const collectionMock = jest.fn();

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AdminAuditService,
        {
          provide: FirebaseService,
          useValue: {
            db: {
              collection: collectionMock,
            },
          },
        },
      ],
    }).compile();

    service = module.get<AdminAuditService>(AdminAuditService);
    jest.clearAllMocks();
  });

  it('returns ad approval logs only when the ad has an approval timestamp', async () => {
    const approvedAt = new Date('2026-04-27T04:30:00.000Z');
    const snapshots: Record<string, unknown> = {
      users: snapshot([]),
      ads: snapshot([
        {
          id: 'seed-active-ad',
          data: { status: 'active', lenderName: 'Seed Lender' },
        },
        {
          id: 'approved-ad',
          data: {
            status: 'approved',
            lenderName: 'Approved Lender',
            approvedAt,
          },
        },
      ]),
      disputes: snapshot([]),
    };

    collectionMock.mockImplementation((name: string) => ({
      get: jest.fn().mockResolvedValue(snapshots[name]),
    }));

    const result = await service.getAuditLogs();

    expect(result.logs).toEqual([
      expect.objectContaining({
        id: 'AD-A-approved-ad',
        actionType: 'ad_approved',
        targetName: 'Approved Lender',
        dateTime: '2026-04-27 10:00:00',
      }),
    ]);
  });

  it('does not create audit rows for seeded active users, loan requests, or resolved disputes', async () => {
    const snapshots: Record<string, unknown> = {
      users: snapshot([
        {
          id: 'seed-user',
          data: {
            status: 'active',
            kycStatus: 'approved',
            updatedAt: new Date('2026-04-26T04:30:00.000Z'),
          },
        },
      ]),
      ads: snapshot([]),
      disputes: snapshot([
        {
          id: 'seed-resolved-dispute',
          data: {
            status: 'resolved',
            resolution: 'Resolved after reviewing payment and lender records',
            resolvedAt: new Date('2026-04-29T10:14:33.000Z'),
          },
        },
      ]),
      loanRequests: snapshot([
        {
          id: 'request-1',
          data: {
            requestId: 'request-1',
            status: 'accepted',
            amount: 25000,
            createdAt: new Date('2026-04-26T04:30:00.000Z'),
          },
        },
      ]),
    };

    collectionMock.mockImplementation((name: string) => ({
      get: jest.fn().mockResolvedValue(snapshots[name]),
    }));

    const result = await service.getAuditLogs();

    expect(result.logs).toEqual([]);
    expect(collectionMock).not.toHaveBeenCalledWith('loanRequests');
    expect(collectionMock).not.toHaveBeenCalledWith('disputes');
  });
});
