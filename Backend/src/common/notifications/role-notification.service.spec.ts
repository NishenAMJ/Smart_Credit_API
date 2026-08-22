import { RoleNotificationService } from './role-notification.service';

describe('RoleNotificationService', () => {
  const service = new RoleNotificationService({} as never);

  it('namespaces identical domain events by role and recipient', () => {
    const event = {
      eventType: 'dispute_created',
      entityType: 'dispute',
      entityId: 'dispute-1',
      eventId: 'created',
    };

    expect(service.buildId('borrower', 'user-1', event)).not.toBe(
      service.buildId('lender', 'user-1', event),
    );
    expect(service.buildId('borrower', 'user-1', event)).not.toBe(
      service.buildId('borrower', 'user-2', event),
    );
  });
});
