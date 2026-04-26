import { Test, TestingModule } from '@nestjs/testing';
import { ConflictException, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { compare, hash } from 'bcrypt';
import { AuthService } from './auth.service';
import { FirebaseService } from '../../../firebase/firebase.service';

jest.mock('bcrypt', () => ({
  compare: jest.fn(),
  hash: jest.fn(),
}));

describe('AuthService', () => {
  let service: AuthService;
  const getMock = jest.fn();
  const limitMock = jest.fn(() => ({ get: getMock }));
  const whereMock = jest.fn(() => ({ limit: limitMock }));
  const setMock = jest.fn();
  const docMock = jest.fn(() => ({ id: 'admin-new', set: setMock }));
  const signAsyncMock = jest.fn();

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: JwtService,
          useValue: {
            signAsync: signAsyncMock,
            verifyAsync: jest.fn(),
          },
        },
        {
          provide: FirebaseService,
          useValue: {
            db: {
              collection: jest.fn(() => ({
                where: whereMock,
                doc: docMock,
              })),
            },
          },
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('returns a JWT payload for valid admin credentials', async () => {
    getMock.mockResolvedValue({
      empty: false,
      docs: [
        {
          id: 'admin-1',
          data: () => ({
            email: 'admin@example.com',
            role: 'admin',
            passwordHash: 'stored-hash',
          }),
        },
      ],
    });
    signAsyncMock.mockResolvedValue('signed-token');
    (compare as jest.Mock).mockResolvedValue(true);

    const result = await service.adminLogin('admin@example.com', 'password123');

    expect(result).toEqual({
      accessToken: 'signed-token',
      user: {
        uid: 'admin-1',
        email: 'admin@example.com',
        role: 'admin',
      },
    });
    expect(signAsyncMock).toHaveBeenCalled();
  });

  it('rejects non-admin accounts', async () => {
    getMock.mockResolvedValue({
      empty: false,
      docs: [
        {
          id: 'user-1',
          data: () => ({
            email: 'borrower@example.com',
            role: 'borrower',
            passwordHash: 'stored-hash',
          }),
        },
      ],
    });

    await expect(
      service.adminLogin('borrower@example.com', 'password123'),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('creates a new admin account and returns a JWT payload', async () => {
    getMock.mockResolvedValue({ empty: true, docs: [] });
    (hash as jest.Mock).mockResolvedValue('hashed-password');
    signAsyncMock.mockResolvedValue('signed-token');

    const result = await service.adminSignup({
      firstName: 'Sarah',
      lastName: 'Admin',
      email: 'sarah.admin@example.com',
      phone: '+94 77 123 4567',
      department: 'Compliance',
      adminRole: 'Super Admin',
      password: 'Password123!',
    });

    expect(hash).toHaveBeenCalledWith('Password123!', 10);
    expect(setMock).toHaveBeenCalled();
    expect(result).toEqual({
      accessToken: 'signed-token',
      user: {
        uid: 'admin-new',
        email: 'sarah.admin@example.com',
        role: 'admin',
      },
    });
  });

  it('rejects duplicate admin signup emails', async () => {
    getMock.mockResolvedValue({
      empty: false,
      docs: [{ id: 'existing-admin' }],
    });

    await expect(
      service.adminSignup({
        firstName: 'Sarah',
        lastName: 'Admin',
        email: 'sarah.admin@example.com',
        phone: '+94 77 123 4567',
        department: 'Compliance',
        adminRole: 'Super Admin',
        password: 'Password123!',
      }),
    ).rejects.toBeInstanceOf(ConflictException);
  });
});
