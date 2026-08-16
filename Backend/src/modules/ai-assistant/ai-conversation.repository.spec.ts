import { ForbiddenException } from '@nestjs/common';
import type { ConfigService } from '@nestjs/config';
import type { FirebaseService } from '../../firebase/firebase.service';
import { AiConversationRepository } from './ai-conversation.repository';

describe('AiConversationRepository role isolation', () => {
  function buildRepository(conversation: Record<string, unknown>) {
    const snapshot = {
      exists: true,
      get: (field: string) => conversation[field],
      ref: {},
    };
    const firebaseService = {
      getDb: () => ({
        collection: () => ({
          doc: () => ({ get: jest.fn().mockResolvedValue(snapshot) }),
        }),
      }),
    } as unknown as FirebaseService;
    const configService = { get: jest.fn() } as unknown as ConfigService;
    return new AiConversationRepository(firebaseService, configService);
  }

  it('accepts an admin conversation only for the owning admin JWT', async () => {
    const repository = buildRepository({
      userId: 'admin-1',
      userRole: 'admin',
      status: 'active',
    });

    await expect(
      repository.assertOwned(
        'conversation-1',
        { sub: 'admin-1', email: 'admin@example.com', role: 'admin' },
        'admin',
      ),
    ).resolves.toBeDefined();
  });

  it('rejects a conversation when the authenticated role does not match', async () => {
    const repository = buildRepository({
      userId: 'same-user',
      userRole: 'admin',
      status: 'active',
    });

    await expect(
      repository.assertOwned(
        'conversation-1',
        { sub: 'same-user', email: 'user@example.com', role: 'borrower' },
        'borrower',
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });
});
