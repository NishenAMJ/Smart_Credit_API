import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { AdminService } from './admin.service';
import { FirebaseService } from '../../firebase/firebase.service';

describe('AdminService', () => {
  let service: AdminService;
  let collectionMock: jest.Mock;
  let getMock: jest.Mock;
  let docMock: jest.Mock;
  let updateMock: jest.Mock;
  let deleteMock: jest.Mock;

  beforeEach(async () => {
    getMock = jest.fn();
    updateMock = jest.fn();
    deleteMock = jest.fn();
    docMock = jest.fn(() => ({
      get: getMock,
      update: updateMock,
      delete: deleteMock,
    }));
    collectionMock = jest.fn(() => ({
      get: getMock,
      doc: docMock,
    }));

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AdminService,
        {
          provide: FirebaseService,
          useValue: {
            db: {
              collection: collectionMock,
            },
          },
        },
      ],
    }).compile();

    service = module.get<AdminService>(AdminService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('filters users and removes passwordHash from the response', async () => {
    getMock.mockResolvedValue({
      docs: [
        {
          id: 'admin-1',
          data: () => ({
            email: 'admin@example.com',
            role: 'admin',
            status: 'active',
            passwordHash: 'hidden',
          }),
        },
        {
          id: 'borrower-1',
          data: () => ({
            email: 'borrower@example.com',
            role: 'borrower',
            status: 'suspended',
            passwordHash: 'hidden',
          }),
        },
      ],
    });

    const result = await service.getAllUsers({ role: 'admin' });

    expect(result.count).toBe(1);
    expect(result.users[0]).toMatchObject({
      id: 'admin-1',
      email: 'admin@example.com',
      role: 'admin',
    });
    expect(result.users[0]).not.toHaveProperty('passwordHash');
  });

  it('throws NotFoundException when suspending a missing user', async () => {
    getMock.mockResolvedValue({ exists: false });

    await expect(service.suspendUser('missing-user')).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });
});
