import { ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';

import { RolesGuard } from './roles.guard';

describe('RolesGuard', () => {
  function createContext(role?: string) {
    return {
      getHandler: jest.fn(),
      getClass: jest.fn(),
      switchToHttp: () => ({
        getRequest: () => ({
          user: role ? { role } : undefined,
        }),
      }),
    } as any;
  }

  it('allows requests when no roles metadata is set', () => {
    const reflector = {
      getAllAndOverride: jest.fn(() => undefined),
    } as unknown as Reflector;
    const guard = new RolesGuard(reflector);

    expect(guard.canActivate(createContext('borrower'))).toBe(true);
  });

  it('allows requests when the active role matches', () => {
    const reflector = {
      getAllAndOverride: jest.fn(() => ['lender']),
    } as unknown as Reflector;
    const guard = new RolesGuard(reflector);

    expect(guard.canActivate(createContext('lender'))).toBe(true);
  });

  it('rejects requests when the active role does not match', () => {
    const reflector = {
      getAllAndOverride: jest.fn(() => ['admin']),
    } as unknown as Reflector;
    const guard = new RolesGuard(reflector);

    expect(() => guard.canActivate(createContext('borrower'))).toThrow(
      ForbiddenException,
    );
  });
});
