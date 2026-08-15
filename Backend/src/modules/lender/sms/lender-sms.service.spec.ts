import { ConflictException } from '@nestjs/common';
import { LenderSmsService } from './lender-sms.service';

function createSmsProvider() {
  return {
    isConfigured: jest.fn().mockReturnValue(true),
    getSenderId: jest.fn().mockReturnValue('SmartCredit'),
    send: jest.fn().mockResolvedValue('provider_1'),
  };
}

describe('LenderSmsService', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('reports a disabled but configured SMS workspace by default', async () => {
    const settingsRef = {
      get: jest.fn().mockResolvedValue({ data: () => undefined }),
    };
    const db = {
      collection: jest.fn(() => ({ doc: jest.fn(() => settingsRef) })),
    };
    const service = new LenderSmsService(
      { getDb: () => db } as any,
      createSmsProvider(),
    );

    await expect(service.getSettings('lender_1')).resolves.toMatchObject({
      enabled: false,
      configured: true,
      sender: 'SmartCredit',
    });
  });

  it('blocks sending while the lender SMS switch is disabled', async () => {
    const settingsRef = {
      get: jest.fn().mockResolvedValue({ data: () => ({ enabled: false }) }),
    };
    const db = {
      collection: jest.fn(() => ({ doc: jest.fn(() => settingsRef) })),
    };
    const service = new LenderSmsService(
      { getDb: () => db } as any,
      createSmsProvider(),
    );

    await expect(
      service.send('lender_1', {
        borrowerIds: ['borrower_1'],
        message: 'Payment reminder',
      }),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('sends only to a linked borrower and records an audit entry', async () => {
    const settingsRef = {
      get: jest.fn().mockResolvedValue({ data: () => ({ enabled: true }) }),
    };
    const loanQuery = {
      get: jest.fn().mockResolvedValue({
        docs: [{ data: () => ({ borrowerId: 'borrower_1' }) }],
      }),
    };
    const auditSet = jest.fn();
    const auditCommit = jest.fn().mockResolvedValue(undefined);
    const db = {
      collection: jest.fn((name: string) => ({
        doc: jest.fn((id: string) => {
          if (name === 'systemSettings') return settingsRef;
          return { collection: name, id };
        }),
        where: jest.fn(() => loanQuery),
      })),
      getAll: jest.fn().mockResolvedValue([
        {
          id: 'borrower_1',
          data: () => ({
            fullName: 'Borrower One',
            email: 'borrower@example.com',
            phone: '+94770000001',
          }),
        },
      ]),
      batch: jest.fn(() => ({ set: auditSet, commit: auditCommit })),
    };
    const smsProvider = createSmsProvider();
    const service = new LenderSmsService(
      { getDb: () => db } as any,
      smsProvider,
    );

    const result = await service.send('lender_1', {
      borrowerIds: ['borrower_1'],
      message: 'Payment reminder',
    });

    expect(result).toMatchObject({ attempted: 1, sent: 1, failed: 0 });
    expect(smsProvider.send).toHaveBeenCalledWith({
      to: '+94770000001',
      message: 'Payment reminder',
    });
    expect(auditSet).toHaveBeenCalledTimes(1);
    expect(auditCommit).toHaveBeenCalledTimes(1);
  });
});
