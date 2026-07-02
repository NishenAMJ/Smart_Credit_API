import { LenderProfileService } from './lender-profile.service';
import { LenderSettingsService } from '../lender-settings/lender-settings.service';

describe('lender role compatibility', () => {
  it('accepts lenders stored with role arrays in lender profile', async () => {
    const db = {
      collection: jest.fn().mockReturnValue({
        doc: jest.fn().mockReturnValue({
          get: jest.fn().mockResolvedValue({
            exists: true,
            data: () => ({
              role: ['lender'],
              fullName: 'Lender Array',
              email: 'lender@example.com',
            }),
          }),
        }),
      }),
    };
    const service = new LenderProfileService({ getDb: () => db } as any);

    const result = await service.getProfile('lender_1');

    expect(result.fullName).toBe('Lender Array');
    expect(result.email).toBe('lender@example.com');
  });

  it('accepts lenders stored with role arrays in lender settings', async () => {
    const lenderDoc = {
      exists: true,
      data: () => ({
        role: ['lender'],
        preferredRegions: ['Colombo'],
        responseTimeHours: 12,
      }),
    };
    const settingsDoc = {
      data: () => ({
        workspace: {
          pendingRequestsPageSize: 25,
        },
      }),
    };
    const db = {
      collection: jest.fn((name: string) => ({
        doc: jest.fn().mockReturnValue({
          get: jest
            .fn()
            .mockResolvedValue(name === 'users' ? lenderDoc : settingsDoc),
        }),
      })),
    };
    const service = new LenderSettingsService({ getDb: () => db } as any);

    const result = await service.getSettings('lender_1');

    expect(result.lendingDefaults.preferredRegions).toEqual(['Colombo']);
    expect(result.lendingDefaults.defaultResponseTimeHours).toBe(12);
    expect(result.workspace.pendingRequestsPageSize).toBe(25);
  });
});
