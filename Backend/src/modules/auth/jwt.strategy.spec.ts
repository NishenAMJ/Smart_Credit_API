import { ConfigService } from '@nestjs/config';

import type { AuthenticatedUser } from '../../common/types/authenticated-request';
import { JwtStrategy } from './jwt.strategy';

describe('JwtStrategy', () => {
  it('returns the decoded JWT payload during validation', () => {
    const configService = {
      get: jest.fn(() => 'smart-credit-dev-secret'),
    } as unknown as ConfigService;
    const strategy = new JwtStrategy(configService);
    const payload: AuthenticatedUser = {
      sub: 'user-1',
      email: 'nimal@example.com',
      role: 'borrower',
    };

    expect(strategy.validate(payload)).toEqual(payload);
  });
});
