import { ConflictException, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { Timestamp } from 'firebase-admin/firestore';

import { FirebaseService } from '../../firebase/firebase.service';
import { AuthService } from './auth.service';
import type { UserDocument, UserRole } from './auth.types';

jest.mock('bcrypt', () => ({
  hash: jest.fn(),
  compare: jest.fn(),
}));

type QuerySnapshotMock = {
  empty: boolean;
  docs: Array<{ data: () => UserDocument }>;
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
  let queryResults: QuerySnapshotMock[];
  let jwtService: jest.Mocked<Pick<JwtService, 'sign'>>;

  function buildUser(overrides: Partial<UserDocument> = {}): UserDocument {
    return {
      uid: 'user-1',
      role: ['borrower'],
      fullName: 'Nimal Perera',
      photoURL: '',
      phone: '0771234567',
      email: 'nimal@example.com',
      emailLower: 'nimal@example.com',
      phoneNormalized: '+94771234567',
      passwordHash: 'stored-hash',
      creditScore: 640,
      rating: 4.8,
      totalLoansCompleted: 3,
      totalAmountLent: 0,
      totalAmountBorrowed: 150000,
      kycStatus: 'approved',
      accountStatus: 'active',
      authProvider: 'local',
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
      ...overrides,
    };
  }

  function queueQueryResult(user: UserDocument | null): void {
    queryResults.push(
      user
        ? {
            empty: false,
            docs: [{ data: () => user }],
          }
        : {
            empty: true,
            docs: [],
          },
    );
  }

  function setStoredUser(user: UserDocument): void {
    const docRef = usersCollection.doc(user.uid) as UserDocRefMock;
    docRef.get.mockResolvedValue({
      exists: true,
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
          get: jest.fn(async () => queryResults.shift() ?? { empty: true, docs: [] }),
        })),
      })),
      get: jest.fn(),
    };

    const firebaseService = {
      db: {
        collection: jest.fn((name: string) => {
          if (name === 'users') {
            return usersCollection;
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
    expect(createdDocRef.set).toHaveBeenCalledWith(
      expect.objectContaining({
        uid: 'generated-user-id',
        fullName: 'Nimal Perera',
        email: 'Nimal@Example.com',
        emailLower: 'nimal@example.com',
        phone: '077 123 4567',
        phoneNormalized: '+94771234567',
        passwordHash: 'hashed-password',
        accountStatus: 'active',
        authProvider: 'local',
      }),
    );
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
      role: ['borrower', 'lender'],
      passwordHash: 'stored-hash',
    });
    queueQueryResult(user);
    (bcrypt.compare as jest.Mock).mockResolvedValue(true);

    const response = await service.login({
      identifier: 'NIMAL@example.com',
      password: 'SmartPass123',
    });

    expect(jwtService.sign).toHaveBeenCalledWith({
      sub: user.uid,
      email: user.email,
      role: 'borrower',
    });
    expect(existingDocRefs.get(user.uid)?.update).toHaveBeenCalledWith(
      expect.objectContaining({
        lastLoginAt: expect.any(Object),
        updatedAt: expect.any(Object),
      }),
    );
    expect(response).toEqual(
      expect.objectContaining({
        accessToken: 'signed-jwt',
        user: expect.objectContaining({
          uid: user.uid,
          role: 'borrower',
        }),
      }),
    );
  });

  it('logs in by phone using the normalized phone lookup', async () => {
    const user = buildUser({
      uid: 'borrower-2',
      phoneNormalized: '+94771234568',
    });
    queueQueryResult(user);
    queueQueryResult(null);
    (bcrypt.compare as jest.Mock).mockResolvedValue(true);

    await service.login({
      identifier: '077 123 4568',
      password: 'SmartPass123',
    });

    expect(usersCollection.where).toHaveBeenCalledWith(
      'phoneNormalized',
      '==',
      '+94771234568',
    );
  });

  it('rejects blocked or suspended accounts before password comparison', async () => {
    (bcrypt.compare as jest.Mock).mockResolvedValue(true);
    queueQueryResult(buildUser({ accountStatus: 'blocked' }));

    await expect(
      service.login({
        identifier: 'nimal@example.com',
        password: 'SmartPass123',
      }),
    ).rejects.toBeInstanceOf(UnauthorizedException);

    expect(bcrypt.compare).not.toHaveBeenCalled();
  });

  it('rejects invalid passwords or unavailable roles', async () => {
    queueQueryResult(buildUser({ role: ['borrower'] }));
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
      role: ['borrower', 'lender'],
      passwordHash: 'stored-hash',
    });
    queueQueryResult(user);
    (bcrypt.compare as jest.Mock).mockResolvedValue(true);

    const response = await service.login({
      identifier: 'nimal@example.com',
      password: 'SmartPass123',
      role: 'lender',
    });

    expect(jwtService.sign).toHaveBeenCalledWith({
      sub: user.uid,
      email: user.email,
      role: 'lender',
    });
    expect(response.user.role).toBe('lender');
  });

  it('returns the stored session status and falls back to the first available role', async () => {
    const user = buildUser({
      role: ['lender'] as UserRole[],
    });
    setStoredUser(user);

    const response = await service.getSessionStatus(user.uid, 'borrower');

    expect(response).toEqual(
      expect.objectContaining({
        message: 'Authenticated session is valid.',
        activeRole: 'lender',
        availableRoles: ['lender'],
        accountStatus: 'active',
        kycStatus: 'approved',
        user: expect.objectContaining({
          uid: user.uid,
          role: 'lender',
        }),
      }),
    );
  });
});
