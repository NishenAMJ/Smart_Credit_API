import type { FirebaseService } from '../../../firebase/firebase.service';
import { AdminAiToolsService } from './admin-ai-tools.service';

describe('AdminAiToolsService', () => {
  it('exposes only the approved read-only admin tools', () => {
    const service = new AdminAiToolsService({} as FirebaseService);

    expect(service.getDefinitions().map((tool) => tool.name)).toEqual([
      'get_admin_dashboard',
      'search_admin_users',
      'get_admin_user_summary',
      'list_admin_kyc_submissions',
      'list_admin_loan_listings',
      'get_admin_loan_portfolio',
      'list_admin_transactions',
      'list_admin_disputes',
      'list_admin_legal_documents',
      'list_admin_audit_activity',
    ]);
  });

  it('returns allowlisted audit fields without raw sensitive payloads', async () => {
    const document = {
      id: 'audit-1',
      data: () => ({
        auditLogId: 'audit-1',
        actorRole: 'admin',
        action: 'user_reviewed',
        entityType: 'user',
        entityId: 'user-7',
        before: { phone: '+94000000000' },
        after: { passwordHash: 'never-return-this' },
        metadata: { privateUrl: 'https://private.example' },
        createdAt: new Date('2026-08-17T00:00:00.000Z'),
      }),
    };
    const get = jest.fn().mockResolvedValue({ docs: [document] });
    const limit = jest.fn(() => ({ get }));
    const orderBy = jest.fn(() => ({ limit }));
    const firebaseService = {
      getDb: () => ({ collection: () => ({ orderBy }) }),
    } as unknown as FirebaseService;
    const service = new AdminAiToolsService(firebaseService);

    await expect(
      service.execute('admin-1', 'list_admin_audit_activity', {}),
    ).resolves.toEqual([
      {
        auditLogId: 'audit-1',
        actorRole: 'admin',
        action: 'user_reviewed',
        entityType: 'user',
        entityId: 'user-7',
        createdAt: '2026-08-17T00:00:00.000Z',
      },
    ]);
  });
});
