import { ConflictException, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { Timestamp } from 'firebase-admin/firestore';

import { FirebaseService } from '../../firebase/firebase.service';
import { AuthService } from './auth.service';
import type {
  AuthCredentialDocument,
  UserDocument,
  UserRole,
} from './auth.types';

jest.mock('bcrypt', () => ({
  hash: jest.fn(),
  compare: jest.fn(),
}));

type QuerySnapshotMock = {
  empty: boolean;
  docs: Array<{ id: string; data: () => UserDocument }>;
};

type UserDocRefMock = {
  id: string;
  set: jest.Mock;
  update: jest.Mock;
  get: jest.Mock;
};

describe('AuthService', () => {
  let service: AuthService;
  let usersCollection: {
    doc: jest.Mock;
    where: jest.Mock;
    get: jest.Mock;
  };
  let createdDocRef: UserDocRefMock;
  let existingDocRefs: Map<string, UserDocRefMock>;
  let credentialDocRefs: Map<string, UserDocRefMock>;
  let batch: { create: jest.Mock; commit: jest.Mock };
  let queryResults: QuerySnapshotMock[];
  let jwtService: jest.Mocked<Pick<JwtService, 'sign'>>;

  function buildUser(overrides: Partial<UserDocument> = {}): UserDocument {
    return {
      userId: 'user-1',
      roles: ['borrower'],
      fullName: 'Nimal Perera',
      photoUrl: null,
      phone: '+94771234567',
      email: 'nimal@example.com',
      borrowerProfile: {
        dateOfBirth: null,
        occupation: null,
        monthlyIncomeMinor: null,
        creditScore: 640,
      },
      lenderProfile: null,
      kycStatus: 'approved',
      accountStatus: 'active',
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
      lastLoginAt: null,
      ...overrides,
    };
  }

  function buildCredentials(
    userId: string,
    passwordHash = 'stored-hash',
  ): AuthCredentialDocument {
    const now = Timestamp.now();

    return {
      userId,
      passwordHash,
      passwordChangedAt: now,
      failedLoginAttempts: 0,
      lockedUntil: null,
      createdAt: now,
      updatedAt: now,
    };
  }

  function queueQueryResult(user: UserDocument | null): void {
    queryResults.push(
      user
        ? {
            empty: false,
            docs: [{ id: user.userId, data: () => user }],
          }
        : {
            empty: true,
            docs: [],
          },
    );
  }

  function setStoredUser(user: UserDocument): void {
    const docRef = usersCollection.doc(user.userId) as UserDocRefMock;
    docRef.get.mockResolvedValue({
      exists: true,
      id: user.userId,
      data: () => user,
    });
  }

  beforeEach(() => {
    queryResults = [];
    createdDocRef = {
      id: 'generated-user-id',
      set: jest.fn(),
      update: jest.fn(),
      get: jest.fn(),
    };
    existingDocRefs = new Map<string, UserDocRefMock>();
    credentialDocRefs = new Map<string, UserDocRefMock>();
    batch = {
      create: jest.fn(),
      commit: jest.fn().mockResolvedValue(undefined),
    };

    usersCollection = {
      doc: jest.fn((id?: string) => {
        if (!id) {
          return createdDocRef;
        }

        if (!existingDocRefs.has(id)) {
          existingDocRefs.set(id, {
            id,
            set: jest.fn(),
            update: jest.fn(),
            get: jest.fn(),
          });
        }

        return existingDocRefs.get(id);
      }),
      where: jest.fn(() => ({
        limit: jest.fn(() => ({
          get: jest.fn(
            async () => queryResults.shift() ?? { empty: true, docs: [] },
          ),
        })),
      })),
      get: jest.fn(),
    };

    const credentialsCollection = {
      doc: jest.fn((id: string) => {
        if (!credentialDocRefs.has(id)) {
          const ref: UserDocRefMock = {
            id,
            set: jest.fn(),
            update: jest.fn(),
            get: jest.fn(),
          };
          ref.get.mockResolvedValue({
            exists: true,
            data: () => buildCredentials(id),
          });
          credentialDocRefs.set(id, ref);
        }

        return credentialDocRefs.get(id);
      }),
    };

    const firebaseService = {
      db: {
        batch: jest.fn(() => batch),
        collection: jest.fn((name: string) => {
          if (name === 'users') {
            return usersCollection;
          }

          if (name === 'authCredentials') {
            return credentialsCollection;
          }

          return {
            where: jest.fn(() => ({
              get: jest.fn(async () => ({ docs: [] })),
            })),
          };
        }),
      },
    } as unknown as FirebaseService;

    jwtService = {
      sign: jest.fn().mockReturnValue('signed-jwt'),
    };

    service = new AuthService(
      firebaseService,
      jwtService as unknown as JwtService,
    );
  });

  afterEach(() => {
    jest.restoreAllMocks();
    (bcrypt.hash as jest.Mock).mockReset();
    (bcrypt.compare as jest.Mock).mockReset();
  });

  it('registers a user with normalized auth fields and a password hash', async () => {
    queueQueryResult(null);
    queueQueryResult(null);
    queueQueryResult(null);
    queueQueryResult(null);
    (bcrypt.hash as jest.Mock).mockResolvedValue('hashed-password');

    const response = await service.register({
      fullName: '  Nimal Perera  ',
      email: 'Nimal@Example.com',
      phone: '077 123 4567',
      password: 'SmartPass123',
      role: 'borrower',
    });

    expect(bcrypt.hash).toHaveBeenCalledWith('SmartPass123', 10);
    expect(batch.create).toHaveBeenCalledWith(
      createdDocRef,
      expect.objectContaining({
        userId: 'generated-user-id',
        roles: ['borrower'],
        fullName: 'Nimal Perera',
        email: 'nimal@example.com',
        phone: '+94771234567',
        accountStatus: 'active',
      }),
    );
    expect(batch.create).toHaveBeenCalledWith(
      credentialDocRefs.get('generated-user-id'),
      expect.objectContaining({
        userId: 'generated-user-id',
        passwordHash: 'hashed-password',
      }),
    );
    expect(batch.commit).toHaveBeenCalled();
    expect(response).toEqual(
      expect.objectContaining({
        message: 'Account created successfully. Please log in to continue.',
        user: expect.objectContaining({
          uid: 'generated-user-id',
          role: 'borrower',
        }),
      }),
    );
  });

  it('rejects duplicate registration by email', async () => {
    queueQueryResult(buildUser());
    queueQueryResult(null);
    queueQueryResult(null);
    queueQueryResult(null);

    await expect(
      service.register({
        fullName: 'Nimal Perera',
        email: 'nimal@example.com',
        phone: '0771234567',
        password: 'SmartPass123',
        role: 'borrower',
      }),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('logs in by email and updates last login metadata', async () => {
    const user = buildUser({
      roles: ['borrower', 'lender'],
    });
    queueQueryResult(user);
    (bcrypt.compare as jest.Mock).mockResolvedValue(true);

    const response = await service.login({
      identifier: 'NIMAL@example.com',
      password: 'SmartPass123',
    });

    expect(jwtService.sign).toHaveBeenCalledWith({
      sub: user.userId,
      email: user.email,
      role: 'borrower',
    });
    expect(existingDocRefs.get(user.userId)?.update).toHaveBeenCalledWith(
      expect.objectContaining({
        lastLoginAt: expect.any(Object),
        updatedAt: expect.any(Object),
      }),
    );
    expect(response).toEqual(
      expect.objectContaining({
        accessToken: 'signed-jwt',
        availableRoles: ['borrower', 'lender'],
        user: expect.objectContaining({
          uid: user.userId,
          role: 'borrower',
        }),
      }),
    );
  });

  it('repairs a missing canonical roles array from a valid primary role during login', async () => {
    const user = buildUser({
      roles: [],
      primaryRole: 'borrower',
    });
    queueQueryResult(user);
    (bcrypt.compare as jest.Mock).mockResolvedValue(true);

    const response = await service.login({
      identifier: 'nimal@example.com',
      password: 'SmartPass123',
    });

    expect(existingDocRefs.get(user.userId)?.update).toHaveBeenCalledWith(
      expect.objectContaining({ roles: ['borrower'] }),
    );
    expect(response.user.role).toBe('borrower');
    expect(response.availableRoles).toEqual(['borrower']);
  });

  it('updates the stored password hash after verifying the current password', async () => {
    const user = buildUser({
      userId: 'admin-1',
      roles: ['admin'],
    });
    setStoredUser(user);
    (bcrypt.compare as jest.Mock).mockResolvedValue(true);
    (bcrypt.hash as jest.Mock).mockResolvedValue('new-hash');

    const response = await service.changePassword('admin-1', {
      currentPassword: 'OldPass123',
      newPassword: 'NewPass123',
    });

    expect(bcrypt.compare).toHaveBeenCalledWith('OldPass123', 'stored-hash');
    expect(bcrypt.hash).toHaveBeenCalledWith('NewPass123', 10);
    expect(credentialDocRefs.get('admin-1')?.update).toHaveBeenCalledWith(
      expect.objectContaining({
        passwordHash: 'new-hash',
        updatedAt: expect.any(Object),
      }),
    );
    expect(response).toEqual({
      message: 'Password updated successfully.',
    });
  });

  it('rejects password changes when the current password is wrong', async () => {
    const user = buildUser({
      userId: 'admin-1',
      roles: ['admin'],
    });
    setStoredUser(user);
    (bcrypt.compare as jest.Mock).mockResolvedValue(false);

    await expect(
      service.changePassword('admin-1', {
        currentPassword: 'WrongPass123',
        newPassword: 'NewPass123',
      }),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('accepts a legacy string role and returns admin correctly', async () => {
    const user = buildUser({
      userId: 'admin-1',
      roles: 'admin' as unknown as UserRole[],
      accountStatus: 'active',
    });
    queueQueryResult(user);
    (bcrypt.compare as jest.Mock).mockResolvedValue(true);

    const response = await service.login({
      identifier: 'nimal@example.com',
      password: 'SmartPass123',
    });

    expect(jwtService.sign).toHaveBeenCalledWith({
      sub: user.userId,
      email: user.email,
      role: 'admin',
    });
    expect(response.user.role).toBe('admin');
  });

  it('treats admin as exclusive when a legacy account contains mixed roles', async () => {
    const user = buildUser({
      userId: 'admin-1',
      roles: ['borrower', 'lender', 'admin'],
    });
    queueQueryResult(user);
    (bcrypt.compare as jest.Mock).mockResolvedValue(true);

    const response = await service.login({
      identifier: 'nimal@example.com',
      password: 'SmartPass123',
    });

    expect(jwtService.sign).toHaveBeenCalledWith({
      sub: user.userId,
      email: user.email,
      role: 'admin',
    });
    expect(response.user.role).toBe('admin');
    expect(response.availableRoles).toEqual(['admin']);
  });

  it('logs in by phone using the normalized phone lookup', async () => {
    const user = buildUser({
      userId: 'borrower-2',
      phone: '+94771234568',
    });
    queueQueryResult(user);
    queueQueryResult(null);
    (bcrypt.compare as jest.Mock).mockResolvedValue(true);

    await service.login({
      identifier: '077 123 4568',
      password: 'SmartPass123',
    });

    expect(usersCollection.where).toHaveBeenCalledWith(
      'phone',
      '==',
      '+94771234568',
    );
  });

  it('rejects blocked or suspended accounts before password comparison', async () => {
    (bcrypt.compare as jest.Mock).mockResolvedValue(true);
    queueQueryResult(buildUser({ accountStatus: 'suspended' }));

    await expect(
      service.login({
        identifier: 'nimal@example.com',
        password: 'SmartPass123',
      }),
    ).rejects.toBeInstanceOf(UnauthorizedException);

    expect(bcrypt.compare).not.toHaveBeenCalled();
  });

  it('rejects invalid passwords or unavailable roles', async () => {
    queueQueryResult(buildUser({ roles: ['borrower'] }));
    (bcrypt.compare as jest.Mock).mockResolvedValue(true);

    await expect(
      service.login({
        identifier: 'nimal@example.com',
        password: 'SmartPass123',
        role: 'lender',
      }),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('uses the requested role when it is allowed for the account', async () => {
    const user = buildUser({
      roles: ['borrower', 'lender'],
    });
    queueQueryResult(user);
    (bcrypt.compare as jest.Mock).mockResolvedValue(true);

    const response = await service.login({
      identifier: 'nimal@example.com',
      password: 'SmartPass123',
      role: 'lender',
    });

    expect(jwtService.sign).toHaveBeenCalledWith({
      sub: user.userId,
      email: user.email,
      role: 'lender',
    });
    expect(response.user.role).toBe('lender');
    expect(response.availableRoles).toEqual(['borrower', 'lender']);
  });

  it('returns the stored session status and falls back to the first available role', async () => {
    const user = buildUser({
      roles: ['lender'] as UserRole[],
    });
    setStoredUser(user);

    const response = await service.getSessionStatus(user.userId, 'borrower');

    expect(response).toEqual(
      expect.objectContaining({
        message: 'Authenticated session is valid.',
        activeRole: 'lender',
        availableRoles: ['lender'],
        accountStatus: 'active',
        kycStatus: 'approved',
        user: expect.objectContaining({
          uid: user.userId,
          role: 'lender',
        }),
      }),
    );
  });
});
