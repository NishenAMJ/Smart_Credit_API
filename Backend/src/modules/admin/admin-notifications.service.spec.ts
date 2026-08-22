import { AdminNotificationsService } from './admin-notifications.service';

describe('AdminNotificationsService', () => {
  const notificationDocs = [
    {
      id: 'notification-1',
      get: (field: string) =>
        field === 'createdAt' ? new Date('2026-08-22T10:00:00Z') : undefined,
      data: () => ({
        audienceRole: 'admin',
        title: 'Review KYC',
        body: 'A KYC submission is pending.',
        category: 'kyc',
        createdAt: new Date('2026-08-22T10:00:00Z'),
      }),
    },
  ];

  function createService(readByAdmin: Record<string, string[]> = {}) {
    const collection = jest.fn((name: string) => {
      if (name === 'adminNotifications') {
        const query = {
          where: jest.fn(() => query),
          get: jest.fn().mockResolvedValue({ docs: notificationDocs }),
        };
        return query;
      }
      const query = {
        where: jest.fn((_field: string, _operator: string, adminId: string) => ({
          get: jest.fn().mockResolvedValue({
            docs: (readByAdmin[adminId] ?? []).map((notificationId) => ({
              get: () => notificationId,
            })),
          }),
        })),
      };
      return query;
    });
    return new AdminNotificationsService({ db: { collection } } as never);
  }

  it('keeps shared notification read state independent for each admin', async () => {
    const service = createService({ 'admin-1': ['notification-1'] });

    const firstAdmin = await service.list('admin-1', 'all');
    const secondAdmin = await service.list('admin-2', 'all');

    expect(firstAdmin.notifications[0].isRead).toBe(true);
    expect(firstAdmin.unreadCount).toBe(0);
    expect(secondAdmin.notifications[0].isRead).toBe(false);
    expect(secondAdmin.unreadCount).toBe(1);
  });
});
