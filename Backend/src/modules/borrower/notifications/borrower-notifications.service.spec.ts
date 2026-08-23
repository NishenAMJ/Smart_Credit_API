import { BorrowerNotificationsService } from './borrower-notifications.service';

describe('BorrowerNotificationsService', () => {
  it('should be defined', () => {
    const service = new BorrowerNotificationsService({} as any);

    expect(service).toBeDefined();
  });

  it('builds status notifications from canonical application fields', async () => {
    const applicationQuery = {
      orderBy: jest.fn(),
      limit: jest.fn(),
    } as any;
    applicationQuery.orderBy.mockReturnValue(applicationQuery);
    applicationQuery.limit.mockReturnValue(applicationQuery);
    applicationQuery.get = jest.fn(async () => ({
      docs: [
        {
          id: 'application_1',
          data: () => ({
            applicationId: 'application_1',
            borrowerId: 'borrower_1',
            requestedPrincipalMinor: 12_500_000,
            status: 'converted',
            updatedAt: new Date('2026-08-21T00:00:00.000Z'),
          }),
        },
      ],
    }));
    const db = {
      collection: jest.fn((name: string) => {
        if (name === 'loanApplications') {
          return {
            where: jest.fn(() => applicationQuery),
          };
        }
        if (name === 'loans') {
          return {
            where: jest.fn(() => ({
              get: jest.fn(async () => ({ docs: [] })),
            })),
          };
        }
        if (name === 'users') {
          return {
            doc: jest.fn(() => ({
              get: jest.fn(async () => ({
                data: () => ({ kycStatus: 'approved' }),
              })),
            })),
          };
        }
        throw new Error(`Unexpected collection ${name}`);
      }),
    };
    const service = new BorrowerNotificationsService({
      getDb: () => db,
    } as any);

    const drafts = await (service as any).buildNotificationDrafts('borrower_1');

    expect(drafts).toContainEqual(
      expect.objectContaining({
        id: 'application-approved-application_1',
        title: 'Application approved',
        relatedEntityId: 'application_1',
        metadata: { status: 'converted', amount: 125_000 },
      }),
    );
  });
});
