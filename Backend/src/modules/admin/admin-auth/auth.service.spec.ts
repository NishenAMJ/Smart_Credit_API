import { Test, TestingModule } from '@nestjs/testing';
import { UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { compare } from 'bcrypt';
import { AuthService } from './auth.service';
import { FirebaseService } from '../../../firebase/firebase.service';

jest.mock('bcrypt', () => ({
  compare: jest.fn(),
}));

describe('AuthService', () => {
  let service: AuthService;
  const getMock = jest.fn();
  const limitMock = jest.fn(() => ({ get: getMock }));
  const whereMock = jest.fn(() => ({ limit: limitMock }));
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
});
