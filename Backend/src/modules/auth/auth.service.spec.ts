import { NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { FirebaseService } from '../../firebase/firebase.service';
import { AuthService } from './auth.service';

describe('AuthService', () => {
  function createEmptyUsersQuery() {
    const get = jest.fn().mockResolvedValue({ empty: true, docs: [] });
    const limit = jest.fn().mockReturnValue({ get });
    const where = jest.fn().mockReturnValue({ limit });

    return { where, limit, get };
  }

  it('throws a clear error when login identifier is not found', async () => {
    const usersQuery = createEmptyUsersQuery();
    const collection = jest.fn().mockReturnValue(usersQuery);
    const service = new AuthService(
      { db: { collection } } as unknown as FirebaseService,
      { signAsync: jest.fn() } as unknown as JwtService,
      { get: jest.fn() } as unknown as ConfigService,
    );

    await expect(
      service.login({
        identifier: 'missing@example.com',
        password: 'secret123',
      }),
    ).rejects.toBeInstanceOf(NotFoundException);

    expect(collection).toHaveBeenCalledWith('users');
    expect(usersQuery.where).toHaveBeenCalledWith(
      'email',
      '==',
      'missing@example.com',
    );
    expect(usersQuery.where).toHaveBeenCalledWith(
      'phone',
      '==',
      'missing@example.com',
    );
  });
});
