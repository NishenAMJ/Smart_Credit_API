import { AdminAuditService } from './admin-audit.service';
import { FirebaseService } from '../../firebase/firebase.service';

describe('AdminAuditService', () => {
  const get = jest.fn();
  const limit = jest.fn();
  const startAfter = jest.fn();
  const orderBy = jest.fn();
  const docGet = jest.fn();
  const doc = jest.fn(() => ({ get: docGet }));
  const query = { get, limit, startAfter };
  const collection = jest.fn(() => ({ orderBy, doc }));
  const service = new AdminAuditService({
    db: { collection },
  } as unknown as FirebaseService);

  beforeEach(() => {
    jest.clearAllMocks();
    orderBy.mockReturnValue(query);
    limit.mockReturnValue(query);
    startAfter.mockReturnValue(query);
  });

  it('queries only immutable audit logs with ordering and a bounded page', async () => {
    get.mockResolvedValue({
      size: 1,
      docs: [
        {
          id: 'audit-1',
          data: () => ({
            action: 'ad.approved',
            actorUserId: 'admin-1',
            entityType: 'ad',
            entityId: 'listing-1',
            metadata: { description: 'Ad approved' },
            createdAt: new Date('2026-04-27T04:30:00.000Z'),
          }),
        },
      ],
    });

    const result = await service.getAuditLogs('20');

    expect(collection).toHaveBeenCalledTimes(1);
    expect(collection).toHaveBeenCalledWith('auditLogs');
    expect(orderBy).toHaveBeenCalledWith('createdAt', 'desc');
    expect(limit).toHaveBeenCalledWith(21);
    expect(result).toMatchObject({
      success: true,
      count: 1,
      hasMore: false,
      logs: [
        {
          id: 'audit-1',
          actionType: 'ad_approved',
          description: 'Ad approved',
          performedBy: 'admin-1',
          targetName: 'listing-1',
          targetType: 'ad',
          severity: 'success',
        },
      ],
    });
  });

  it('uses a document cursor and returns a next cursor', async () => {
    docGet.mockResolvedValue({ exists: true, id: 'cursor-1' });
    get.mockResolvedValue({
      size: 2,
      docs: [
        { id: 'audit-2', data: () => ({ action: 'system.event' }) },
        { id: 'audit-3', data: () => ({ action: 'system.event' }) },
      ],
    });

    const result = await service.getAuditLogs('1', 'cursor-1');

    expect(doc).toHaveBeenCalledWith('cursor-1');
    expect(startAfter).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'cursor-1' }),
    );
    expect(result).toMatchObject({
      count: 1,
      hasMore: true,
      nextCursor: 'audit-2',
    });
  });
});
