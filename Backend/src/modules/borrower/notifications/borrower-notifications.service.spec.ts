import { BorrowerNotificationsService } from './borrower-notifications.service';

describe('BorrowerNotificationsService', () => {
  it('should be defined', () => {
    const service = new BorrowerNotificationsService({} as any);

    expect(service).toBeDefined();
  });
});

