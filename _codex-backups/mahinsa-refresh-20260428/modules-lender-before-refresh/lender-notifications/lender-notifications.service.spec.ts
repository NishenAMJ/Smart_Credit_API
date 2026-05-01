import { LenderNotificationsService } from './lender-notifications.service';

function createNotificationDoc(id: string, overrides: Record<string, unknown> = {}) {
  const data = {
    lenderId: 'lender_1',
    category: 'loan_request',
    eventType: 'new_request',
    title: `Notification ${id}`,
    message: 'Message',
    severity: 'info',
    isRead: false,
    createdAt: '2026-04-21T00:00:00.000Z',
    readAt: null,
    relatedEntityType: 'loanRequest',
    relatedEntityId: 'req_1',
    actionLabel: 'Open',
    actionTarget: 'pending-requests',
    metadata: {},
    ...overrides,
  };

  return {
    id,
    data: () => data,
    get: (field: string) => data[field],
  } as any;
}

describe('LenderNotificationsService', () => {
  it('returns paginated notifications while preserving summary counts', async () => {
    const service = new LenderNotificationsService({ getDb: () => ({}) } as any);
    jest.spyOn(service as any, 'syncNotifications').mockResolvedValue(undefined);
    jest.spyOn(service as any, 'loadNotifications').mockResolvedValue([
      { id: 'n1', category: 'loan_request', severity: 'info', isRead: false, createdAt: '2026-04-21T00:00:00.000Z' },
      { id: 'n2', category: 'ad', severity: 'warning', isRead: true, createdAt: '2026-04-20T00:00:00.000Z' },
    ]);
    jest.spyOn(service as any, 'buildNotificationsQuery').mockReturnValue({
      get: jest.fn().mockResolvedValue({
        docs: Array.from({ length: 11 }, (_, index) =>
          createNotificationDoc(`n${index + 1}`, {
            category: index % 2 === 0 ? 'loan_request' : 'ad',
            isRead: index === 0 ? false : true,
            severity: index % 2 === 0 ? 'info' : 'warning',
            createdAt: `2026-04-${String(21 - index).padStart(2, '0')}T00:00:00.000Z`,
          }),
        ),
      }),
    });

    const result = await service.getNotifications('lender_1', undefined, 'all', 10);

    expect(result.unreadCount).toBe(1);
    expect(result.notifications).toHaveLength(10);
    expect(result.pageInfo.hasMore).toBe(true);
  });

  it('keeps summary behavior intact', async () => {
    const service = new LenderNotificationsService({ getDb: () => ({}) } as any);
    jest.spyOn(service as any, 'syncNotifications').mockResolvedValue(undefined);
    jest.spyOn(service as any, 'loadNotifications').mockResolvedValue([
      { id: 'n1', category: 'loan_request', severity: 'critical', isRead: false, createdAt: new Date().toISOString() },
      { id: 'n2', category: 'ad', severity: 'info', isRead: true, createdAt: '2026-04-20T00:00:00.000Z' },
    ]);

    const result = await service.getSummary('lender_1');

    expect(result.unreadCount).toBe(1);
    expect(result.highPriorityCount).toBe(1);
    expect(result.totalCount).toBe(2);
  });
});
