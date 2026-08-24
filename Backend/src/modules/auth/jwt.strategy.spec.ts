import { UnauthorizedException } from '@nestjs/common';

import { JwtStrategy } from './jwt.strategy';

describe('JwtStrategy', () => {
  const get = jest.fn();
  const firebase = {
    db: {
      collection: jest.fn(() => ({
        doc: jest.fn(() => ({ get })),
      })),
    },
  };
  const config = { get: jest.fn(() => 'test-secret') };

  beforeEach(() => jest.clearAllMocks());

  it('restores an active role from the canonical user document', async () => {
    get.mockResolvedValue({
      exists: true,
      data: () => ({
        email: 'canonical@example.test',
        roles: ['borrower'],
        accountStatus: 'active',
      }),
    });
    const strategy = new JwtStrategy(config as never, firebase as never);

    await expect(
      strategy.validate({
        sub: 'borrower-1',
        email: 'old@example.test',
        role: 'borrower',
      }),
    ).resolves.toEqual({
      sub: 'borrower-1',
      email: 'canonical@example.test',
      role: 'borrower',
    });
  });

  it.each([
    [false, undefined, 'deleted account'],
    [true, { roles: ['borrower'], accountStatus: 'suspended' }, 'suspension'],
    [true, { roles: ['lender'], accountStatus: 'active' }, 'removed role'],
    [
      true,
      { roles: ['borrower', 'lender'], accountStatus: 'active' },
      'conflicting roles',
    ],
  ])('rejects a stale token after %s (%s)', async (exists, data) => {
    get.mockResolvedValue({ exists, data: () => data });
    const strategy = new JwtStrategy(config as never, firebase as never);

    await expect(
      strategy.validate({
        sub: 'borrower-1',
        email: 'borrower@example.test',
        role: 'borrower',
      }),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });
});
