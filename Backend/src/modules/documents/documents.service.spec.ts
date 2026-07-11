import { Test, TestingModule } from '@nestjs/testing';

import { FirebaseService } from '../../firebase/firebase.service';
import { DocumentsService } from './documents.service';

describe('DocumentsService', () => {
  let service: DocumentsService;
  let collectionMock: {
    doc: jest.Mock;
    where: jest.Mock;
  };

  beforeEach(async () => {
    collectionMock = {
      doc: jest.fn(() => ({
        id: 'doc-1',
        set: jest.fn().mockResolvedValue(undefined),
        get: jest.fn().mockResolvedValue({
          exists: true,
          id: 'doc-1',
          data: () => ({
            id: 'doc-1',
            userId: 'user-1',
            category: 'kyc',
            status: 'pending_review',
          }),
        }),
        update: jest.fn().mockResolvedValue(undefined),
      })),
      where: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DocumentsService,
        {
          provide: FirebaseService,
          useValue: {
            db: {
              collection: jest.fn(() => collectionMock),
            },
          },
        },
      ],
    }).compile();

    service = module.get<DocumentsService>(DocumentsService);
  });

  it('creates structured document records', async () => {
    const docRef = {
      id: 'doc-1',
      set: jest.fn().mockResolvedValue(undefined),
    };
    collectionMock.doc.mockReturnValueOnce(docRef);

    const result = await service.createRecord({
      userId: 'user-1',
      category: 'kyc',
      documentType: 'nic_front',
      originalFilename: 'nic-front.pdf',
      mimeType: 'application/pdf',
      fileHash: 'hash-1',
      uploadedMedia: {
        assetId: 'asset-1',
        publicId: 'documents/user-1/kyc/doc-1',
        version: 1,
        format: 'pdf',
        bytes: 2048,
        resourceType: 'raw',
        deliveryType: 'authenticated',
        secureUrl: 'https://example.com/doc-1.pdf',
        uploadedAt: new Date().toISOString(),
      },
    });

    expect(docRef.set).toHaveBeenCalledTimes(1);
    expect(result.userId).toBe('user-1');
    expect(result.status).toBe('pending_review');
  });

  it('filters deleted records from user document lists', async () => {
    const get = jest.fn().mockResolvedValue({
      docs: [
        {
          id: 'doc-1',
          data: () => ({ userId: 'user-1', category: 'kyc', status: 'pending_review' }),
        },
        {
          id: 'doc-2',
          data: () => ({ userId: 'user-1', category: 'kyc', status: 'deleted' }),
        },
      ],
    });
    const orderBy = jest.fn(() => ({ get }));
    const whereByCategory = jest.fn(() => ({ orderBy }));
    const whereByUser = jest.fn(() => ({ where: whereByCategory }));
    collectionMock.where.mockImplementation(whereByUser);

    const result = await service.listByUser('user-1', 'kyc');

    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('doc-1');
  });

  it('returns pending review documents with pagination metadata', async () => {
    const get = jest.fn().mockResolvedValue({
      size: 2,
      docs: [
        {
          id: 'doc-1',
          data: () => ({ userId: 'user-1', category: 'kyc', status: 'pending_review' }),
        },
        {
          id: 'doc-2',
          data: () => ({ userId: 'user-2', category: 'kyc', status: 'pending_review' }),
        },
      ],
    });
    const limit = jest.fn(() => ({ get }));
    const orderBy = jest.fn(() => ({ limit }));
    const whereByStatus = jest.fn(() => ({ orderBy }));
    const whereByCategory = jest.fn(() => ({ where: whereByStatus }));
    collectionMock.where.mockImplementation(whereByCategory);

    const result = await service.getPendingReview(1);

    expect(result.documents).toHaveLength(1);
    expect(result.hasMore).toBe(true);
    expect(result.nextCursor).toBe('doc-1');
  });

  it('soft deletes document records', async () => {
    const update = jest.fn().mockResolvedValue(undefined);
    collectionMock.doc.mockReturnValueOnce({
      id: 'doc-1',
      update,
    });

    await service.softDelete('doc-1', 'admin-1', 'retention cleanup');

    expect(update).toHaveBeenCalledTimes(1);
    expect(update.mock.calls[0][0].status).toBe('deleted');
  });
});
