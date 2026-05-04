import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';

import { FirebaseService } from '../../firebase/firebase.service';
import { AuthService } from '../auth/auth.service';
import { DocumentsService } from '../documents/documents.service';
import { MediaService } from '../media/media.service';
import { KycService } from './kyc.service';

describe('KycService', () => {
  let service: KycService;
  let authService: {
    updateUserKycStatus: jest.Mock;
  };
  let documentsService: {
    findDuplicate: jest.Mock;
    createRecord: jest.Mock;
    listByUser: jest.Mock;
    getPendingReview: jest.Mock;
    updateReviewStatus: jest.Mock;
    getById: jest.Mock;
  };
  let mediaService: {
    ensureCloudinaryConfigured: jest.Mock;
    uploadProfilePictureFromDataUrl: jest.Mock;
    decodeDataUrl: jest.Mock;
    validateSensitiveDocument: jest.Mock;
    computeSha256: jest.Mock;
    uploadSensitiveDocumentFromDataUrl: jest.Mock;
    generateSignedDeliveryUrl: jest.Mock;
  };
  let userSet: jest.Mock;

  beforeEach(async () => {
    userSet = jest.fn().mockResolvedValue(undefined);

    authService = {
      updateUserKycStatus: jest.fn().mockResolvedValue(undefined),
    };

    documentsService = {
      findDuplicate: jest.fn().mockResolvedValue(null),
      createRecord: jest.fn(),
      listByUser: jest.fn().mockResolvedValue([]),
      getPendingReview: jest.fn().mockResolvedValue({
        documents: [],
        hasMore: false,
        nextCursor: undefined,
      }),
      updateReviewStatus: jest.fn().mockResolvedValue(undefined),
      getById: jest.fn(),
    };

    mediaService = {
      ensureCloudinaryConfigured: jest.fn(),
      uploadProfilePictureFromDataUrl: jest.fn().mockResolvedValue({
        publicId: 'profile-pictures/user-1/avatar',
        secureUrl: 'https://res.cloudinary.com/demo/image/upload/v1/avatar.jpg',
        version: 1,
        format: 'jpg',
        bytes: 1234,
      }),
      decodeDataUrl: jest.fn().mockReturnValue({
        mimeType: 'application/pdf',
        buffer: Buffer.from('pdf'),
      }),
      validateSensitiveDocument: jest.fn(),
      computeSha256: jest
        .fn()
        .mockReturnValueOnce('hash-1')
        .mockReturnValueOnce('hash-2')
        .mockReturnValueOnce('hash-3')
        .mockReturnValueOnce('hash-4'),
      uploadSensitiveDocumentFromDataUrl: jest.fn().mockResolvedValue({
        uploaded: {
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
        mimeType: 'application/pdf',
        originalFilename: 'nic-front.pdf',
        fileHash: 'hash-1',
      }),
      generateSignedDeliveryUrl: jest
        .fn()
        .mockReturnValue('https://res.cloudinary.com/demo/raw/authenticated/s--sig--/v1/doc.pdf'),
    };

    let documentCounter = 0;
    const usersCollection = {
      doc: jest.fn(() => ({
        id: 'user-1',
        set: userSet,
      })),
    };
    const documentsCollection = {
      doc: jest.fn(() => ({
        id: `generated-doc-${++documentCounter}`,
      })),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        KycService,
        {
          provide: FirebaseService,
          useValue: {
            db: {
              collection: jest.fn((name: string) => {
                if (name === 'users') {
                  return usersCollection;
                }

                if (name === 'documents') {
                  return documentsCollection;
                }

                return {
                  doc: jest.fn(),
                };
              }),
            },
          },
        },
        {
          provide: AuthService,
          useValue: authService,
        },
        {
          provide: DocumentsService,
          useValue: documentsService,
        },
        {
          provide: MediaService,
          useValue: mediaService,
        },
      ],
    }).compile();

    service = module.get<KycService>(KycService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('rejects invalid or missing KYC document IDs', async () => {
    documentsService.getById.mockResolvedValueOnce(null); // nic-front missing

    await expect(
      service.submitMobileKyc({
        role: 'borrower',
        fullName: 'Test User',
        email: 'test@example.com',
        phoneNumber: '0712345678',
        nic: '123456789V',
        birthDate: '2000-01-01',
        passwordHash: 'hashed-password',
        nicFrontDocumentId: 'doc-invalid',
        nicBackDocumentId: 'doc-2',
        addressProofNumber: 'ADDR-1',
        addressProofDocumentId: 'doc-3',
        bankAccountNumber: '1234567890',
        bankName: 'Test Bank',
        branchCode: '001',
        accountType: 'savings',
        bankDocumentId: 'doc-4',
        profilePhotoUrl: 'https://example.com/profile.jpg',
        userId: 'user-1',
      }),
    ).rejects.toThrow(BadRequestException);
  });

  it('submits KYC successfully by linking existing documents', async () => {
    const mockDoc = (id: string) => ({
      id,
      userId: 'user-1',
      category: 'kyc',
      status: 'pending_review',
      documentType: 'nic_front',
      originalFilename: 'test.pdf',
      mimeType: 'application/pdf',
      fileHash: 'hash',
      uploadedMedia: {},
      uploadedAt: new Date().toISOString(),
    });

    documentsService.getById
      .mockResolvedValueOnce(mockDoc('doc-1'))
      .mockResolvedValueOnce(mockDoc('doc-2'))
      .mockResolvedValueOnce(mockDoc('doc-3'))
      .mockResolvedValueOnce(mockDoc('doc-4'));

    const result = await service.submitMobileKyc({
      role: 'borrower',
      fullName: 'Test User',
      email: 'test@example.com',
      phoneNumber: '0712345678',
      nic: '123456789V',
      birthDate: '2000-01-01',
      passwordHash: 'hashed-password',
      nicFrontDocumentId: 'doc-1',
      nicBackDocumentId: 'doc-2',
      addressProofNumber: 'ADDR-1',
      addressProofDocumentId: 'doc-3',
      bankAccountNumber: '1234567890',
      bankName: 'Test Bank',
      branchCode: '001',
      accountType: 'savings',
      bankDocumentId: 'doc-4',
      profilePhotoUrl: 'https://example.com/profile.jpg',
      userId: 'user-1',
    });

    expect(userSet).toHaveBeenCalled();
    expect(result.success).toBe(true);
    expect(result.documentIds).toContain('doc-1');
  });

  it('returns a signed KYC access URL for the document owner', async () => {
    documentsService.getById.mockResolvedValue({
      id: 'doc-1',
      userId: 'user-1',
      category: 'kyc',
      status: 'approved',
      cloudinaryPublicId: 'documents/user-1/kyc/doc-1',
      cloudinaryResourceType: 'raw',
      cloudinaryDeliveryType: 'authenticated',
      cloudinaryVersion: 1,
      format: 'pdf',
    });

    const result = await service.getSignedDocumentAccessUrl(
      'doc-1',
      'user-1',
      'borrower',
    );

    expect(mediaService.generateSignedDeliveryUrl).toHaveBeenCalledTimes(1);
    expect(result.accessUrl).toContain('s--sig--');
  });

  it('rejects signed URL access for non-owners who are not admins', async () => {
    documentsService.getById.mockResolvedValue({
      id: 'doc-1',
      userId: 'user-1',
      category: 'kyc',
      status: 'approved',
      cloudinaryPublicId: 'documents/user-1/kyc/doc-1',
      cloudinaryResourceType: 'raw',
      cloudinaryDeliveryType: 'authenticated',
      cloudinaryVersion: 1,
      format: 'pdf',
    });

    await expect(
      service.getSignedDocumentAccessUrl('doc-1', 'user-2', 'borrower'),
    ).rejects.toThrow(ForbiddenException);
  });

  it('approves a KYC document and updates the user KYC status', async () => {
    documentsService.getById.mockResolvedValue({
      id: 'doc-1',
      userId: 'user-1',
      category: 'kyc',
      status: 'pending_review',
    });

    const result = await service.approveDocument('doc-1', 'admin-1', 'looks good');

    expect(documentsService.updateReviewStatus).toHaveBeenCalledWith(
      'doc-1',
      'approved',
      {
        reviewedBy: 'admin-1',
        notes: 'looks good',
      },
    );
    expect(authService.updateUserKycStatus).toHaveBeenCalledWith(
      'user-1',
      'approved',
    );
    expect(result.success).toBe(true);
  });

  it('rejects a KYC document and stores the rejection reason', async () => {
    documentsService.getById.mockResolvedValue({
      id: 'doc-1',
      userId: 'user-1',
      category: 'kyc',
      status: 'pending_review',
    });

    const result = await service.rejectDocument(
      'doc-1',
      'document mismatch',
      'admin-1',
    );

    expect(documentsService.updateReviewStatus).toHaveBeenCalledWith(
      'doc-1',
      'rejected',
      {
        reviewedBy: 'admin-1',
        rejectionReason: 'document mismatch',
      },
    );
    expect(authService.updateUserKycStatus).toHaveBeenCalledWith(
      'user-1',
      'rejected',
    );
    expect(result.success).toBe(true);
  });

  it('throws not found when generating access for a deleted or missing KYC document', async () => {
    documentsService.getById.mockResolvedValue(null);

    await expect(
      service.getSignedDocumentAccessUrl('missing-doc', 'user-1', 'borrower'),
    ).rejects.toThrow(NotFoundException);
  });
});
