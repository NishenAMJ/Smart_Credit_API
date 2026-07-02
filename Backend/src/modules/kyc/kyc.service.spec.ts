import {
  BadRequestException,
  ForbiddenException,
  InternalServerErrorException,
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
    uploadBufferAsDocument: jest.Mock;
    generateSignedDeliveryUrl: jest.Mock;
    deleteAsset: jest.Mock;
  };
  let userSet: jest.Mock;
  let documentSnapshots: Record<string, any>;
  let transactionGet: jest.Mock;
  let transactionUpdate: jest.Mock;
  let runTransaction: jest.Mock;

  const buildDataUrl = (mimeType: string, label: string) =>
    `data:${mimeType};base64,${Buffer.from(label).toString('base64')}`;

  beforeEach(async () => {
    userSet = jest.fn().mockResolvedValue(undefined);
    documentSnapshots = {};
    transactionGet = jest.fn(async (docRef: { id: string }) => ({
      exists: Boolean(documentSnapshots[docRef.id]),
      id: docRef.id,
      data: () => documentSnapshots[docRef.id],
    }));
    transactionUpdate = jest.fn().mockResolvedValue(undefined);
    runTransaction = jest.fn(async (callback: any) =>
      callback({
        get: transactionGet,
        update: transactionUpdate,
      }),
    );

    authService = {
      updateUserKycStatus: jest.fn().mockResolvedValue(undefined),
    };

    documentsService = {
      findDuplicate: jest.fn().mockResolvedValue(null),
      createRecord: jest.fn().mockImplementation(async (input: any) => ({
        id: `${input.documentType}-doc`,
        ...input,
        status: input.status ?? 'pending_review',
        uploadedAt: new Date().toISOString(),
        review: undefined,
        cloudinaryAssetId: input.uploadedMedia.assetId,
        cloudinaryPublicId: input.uploadedMedia.publicId,
        cloudinaryResourceType: input.uploadedMedia.resourceType,
        cloudinaryDeliveryType: input.uploadedMedia.deliveryType,
        cloudinaryVersion: input.uploadedMedia.version,
        format: input.uploadedMedia.format,
        fileSize: input.uploadedMedia.bytes,
      })),
      listByUser: jest.fn().mockResolvedValue([]),
      getPendingReview: jest.fn().mockResolvedValue({
        documents: [],
        hasMore: false,
        nextCursor: undefined,
      }),
      updateReviewStatus: jest.fn().mockResolvedValue(undefined),
      softDelete: jest.fn().mockResolvedValue(undefined),
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
      decodeDataUrl: jest.fn().mockImplementation((dataUrl: string, label: string) => {
        const mimeType = dataUrl.startsWith('data:application/pdf')
          ? 'application/pdf'
          : 'image/png';
        return {
          mimeType,
          buffer: Buffer.from(label),
          originalFilename: `${label}.${mimeType === 'application/pdf' ? 'pdf' : 'png'}`,
          resourceType: mimeType === 'application/pdf' ? 'raw' : 'image',
        };
      }),
      validateSensitiveDocument: jest.fn(),
      computeSha256: jest.fn((buffer: Buffer) => `hash-${buffer.toString('hex')}`),
      uploadBufferAsDocument: jest.fn().mockImplementation(
        async (buffer: Buffer, options: { folder: string; publicId: string; resourceType: string; deliveryType: string; }) => ({
          assetId: `asset-${options.publicId}`,
          publicId: `${options.folder}/${options.publicId}`,
          version: 1,
          format: options.resourceType === 'raw' ? 'pdf' : 'png',
          bytes: buffer.length,
          resourceType: options.resourceType,
          deliveryType: options.deliveryType,
          secureUrl: `https://example.com/${options.publicId}`,
          uploadedAt: new Date().toISOString(),
        }),
      ),
      generateSignedDeliveryUrl: jest
        .fn()
        .mockReturnValue('https://res.cloudinary.com/demo/raw/authenticated/s--sig--/v1/doc.pdf'),
      deleteAsset: jest.fn().mockResolvedValue({ result: 'ok' }),
    };

    const usersCollection = {
      doc: jest.fn(() => ({
        id: 'user-1',
        get: jest.fn().mockResolvedValue({
          exists: true,
          data: () => ({
            uid: 'user-1',
            fullName: 'Test User',
            email: 'test@example.com',
            phone: '0712345678',
            passwordHash: 'hashed-password',
            role: ['borrower'],
          }),
        }),
        set: userSet,
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
                  return {
                    doc: jest.fn((id?: string) => ({
                      id: id ?? 'doc-1',
                    })),
                  };
                }

                return {
                  doc: jest.fn(),
                };
              }),
              runTransaction,
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

  it('submits KYC by uploading four Cloudinary documents and storing metadata', async () => {
    const result = await service.submitMobileKyc({
      role: 'borrower',
      fullName: 'Test User',
      email: 'test@example.com',
      phoneNumber: '0712345678',
      nic: '123456789V',
      birthDate: '2000-01-01',
      passwordHash: 'hashed-password',
      nicFrontDataUrl: buildDataUrl('application/pdf', 'nic-front'),
      nicBackDataUrl: buildDataUrl('application/pdf', 'nic-back'),
      addressProofNumber: 'ADDR-1',
      addressProofDataUrl: buildDataUrl('image/png', 'address-proof'),
      bankAccountNumber: '1234567890',
      bankName: 'Test Bank',
      branchCode: '001',
      accountType: 'savings',
      bankDocumentDataUrl: buildDataUrl('application/pdf', 'bank-document'),
      profilePhotoUrl: 'https://example.com/profile.jpg',
      userId: 'user-1',
    });

    expect(mediaService.uploadBufferAsDocument).toHaveBeenCalledTimes(4);
    expect(documentsService.createRecord).toHaveBeenCalledTimes(4);
    expect(userSet).toHaveBeenCalledTimes(1);
    expect(result.success).toBe(true);
    expect(result.kycStatus).toBe('pending');
    expect(result.documentIds).toHaveLength(4);
  });

  it('rejects duplicate KYC uploads', async () => {
    documentsService.findDuplicate.mockResolvedValueOnce({ id: 'existing-doc' });

    await expect(
      service.submitMobileKyc({
        role: 'borrower',
        fullName: 'Test User',
        email: 'test@example.com',
        phoneNumber: '0712345678',
        nic: '123456789V',
        birthDate: '2000-01-01',
        passwordHash: 'hashed-password',
        nicFrontDataUrl: buildDataUrl('application/pdf', 'nic-front'),
        nicBackDataUrl: buildDataUrl('application/pdf', 'nic-back'),
        addressProofNumber: 'ADDR-1',
        addressProofDataUrl: buildDataUrl('image/png', 'address-proof'),
        bankAccountNumber: '1234567890',
        bankName: 'Test Bank',
        branchCode: '001',
        accountType: 'savings',
        bankDocumentDataUrl: buildDataUrl('application/pdf', 'bank-document'),
        profilePhotoUrl: 'https://example.com/profile.jpg',
        userId: 'user-1',
      }),
    ).rejects.toThrow(BadRequestException);

    expect(mediaService.uploadBufferAsDocument).not.toHaveBeenCalled();
  });

  it('rejects invalid KYC files before upload', async () => {
    mediaService.validateSensitiveDocument.mockImplementationOnce(() => {
      throw new BadRequestException('Documents must be 10 MB or smaller.');
    });

    await expect(
      service.submitMobileKyc({
        role: 'borrower',
        fullName: 'Test User',
        email: 'test@example.com',
        phoneNumber: '0712345678',
        nic: '123456789V',
        birthDate: '2000-01-01',
        passwordHash: 'hashed-password',
        nicFrontDataUrl: buildDataUrl('application/pdf', 'nic-front'),
        nicBackDataUrl: buildDataUrl('application/pdf', 'nic-back'),
        addressProofNumber: 'ADDR-1',
        addressProofDataUrl: buildDataUrl('image/png', 'address-proof'),
        bankAccountNumber: '1234567890',
        bankName: 'Test Bank',
        branchCode: '001',
        accountType: 'savings',
        bankDocumentDataUrl: buildDataUrl('application/pdf', 'bank-document'),
        profilePhotoUrl: 'https://example.com/profile.jpg',
        userId: 'user-1',
      }),
    ).rejects.toThrow(BadRequestException);
  });

  it('reuses the stored account profile when submit payload omits identity fields', async () => {
    const result = await service.submitMobileKyc({
      role: 'borrower',
      fullName: '',
      email: '',
      phoneNumber: '',
      nic: '',
      birthDate: '',
      passwordHash: '',
      nicFrontDataUrl: buildDataUrl('application/pdf', 'nic-front'),
      nicBackDataUrl: buildDataUrl('application/pdf', 'nic-back'),
      addressProofNumber: 'ADDR-1',
      addressProofDataUrl: buildDataUrl('image/png', 'address-proof'),
      bankAccountNumber: '1234567890',
      bankName: 'Test Bank',
      branchCode: '001',
      accountType: 'savings',
      bankDocumentDataUrl: buildDataUrl('application/pdf', 'bank-document'),
      profilePhotoUrl: 'https://example.com/profile.jpg',
      userId: 'user-1',
    });

    expect(result.success).toBe(true);
    expect(userSet).toHaveBeenCalledTimes(1);
  });

  it('rolls back already uploaded files when a later upload fails', async () => {
    mediaService.uploadBufferAsDocument
      .mockResolvedValueOnce({
        assetId: 'asset-1',
        publicId: 'documents/user-1/kyc/nic_front-1',
        version: 1,
        format: 'pdf',
        bytes: 10,
        resourceType: 'raw',
        deliveryType: 'authenticated',
        secureUrl: 'https://example.com/1',
        uploadedAt: new Date().toISOString(),
      })
      .mockRejectedValueOnce(
        new InternalServerErrorException('Cloudinary upload failed.'),
      );

    await expect(
      service.submitMobileKyc({
        role: 'borrower',
        fullName: 'Test User',
        email: 'test@example.com',
        phoneNumber: '0712345678',
        nic: '123456789V',
        birthDate: '2000-01-01',
        passwordHash: 'hashed-password',
        nicFrontDataUrl: buildDataUrl('application/pdf', 'nic-front'),
        nicBackDataUrl: buildDataUrl('application/pdf', 'nic-back'),
        addressProofNumber: 'ADDR-1',
        addressProofDataUrl: buildDataUrl('image/png', 'address-proof'),
        bankAccountNumber: '1234567890',
        bankName: 'Test Bank',
        branchCode: '001',
        accountType: 'savings',
        bankDocumentDataUrl: buildDataUrl('application/pdf', 'bank-document'),
        profilePhotoUrl: 'https://example.com/profile.jpg',
        userId: 'user-1',
      }),
    ).rejects.toThrow('Cloudinary upload failed.');

    expect(mediaService.deleteAsset).toHaveBeenCalledTimes(1);
    expect(userSet).not.toHaveBeenCalled();
  });

  it('returns a signed KYC access URL for the document owner', async () => {
    documentsService.getById.mockResolvedValue({
      id: 'doc-1',
      userId: 'user-1',
      category: 'kyc',
      status: 'approved',
      cloudinaryAssetId: 'asset-1',
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
      cloudinaryAssetId: 'asset-1',
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

  it('returns pending review documents and user documents', async () => {
    documentsService.getPendingReview.mockResolvedValueOnce({
      documents: [
        {
          id: 'doc-1',
          userId: 'user-1',
          category: 'kyc',
          documentType: 'nic_front',
          originalFilename: 'nic-front.pdf',
          mimeType: 'application/pdf',
          fileHash: 'hash-1',
          cloudinaryAssetId: 'asset-1',
          cloudinaryPublicId: 'documents/user-1/kyc/doc-1',
          cloudinaryResourceType: 'raw',
          cloudinaryDeliveryType: 'authenticated',
          cloudinaryVersion: 1,
          format: 'pdf',
          fileSize: 2048,
          status: 'pending_review',
          uploadedAt: new Date().toISOString(),
          review: undefined,
        },
      ],
      hasMore: false,
      nextCursor: undefined,
    });
    documentsService.listByUser.mockResolvedValueOnce([
      {
        id: 'doc-2',
        userId: 'user-1',
        category: 'kyc',
        documentType: 'nic_back',
        originalFilename: 'nic-back.pdf',
        mimeType: 'application/pdf',
        fileHash: 'hash-2',
        cloudinaryAssetId: 'asset-2',
        cloudinaryPublicId: 'documents/user-1/kyc/doc-2',
        cloudinaryResourceType: 'raw',
        cloudinaryDeliveryType: 'authenticated',
        cloudinaryVersion: 1,
        format: 'pdf',
        fileSize: 2048,
        status: 'pending_review',
        uploadedAt: new Date().toISOString(),
        review: undefined,
      },
    ]);

    const pending = await service.getPendingKyc();
    const userDocs = await service.getUserDocuments('user-1');

    expect(pending.documents).toHaveLength(1);
    expect(userDocs.documents).toHaveLength(1);
  });

  it('approves a KYC document and updates the user KYC status', async () => {
    documentSnapshots['doc-1'] = {
      userId: 'user-1',
      category: 'kyc',
      status: 'pending_review',
    };

    const result = await service.approveDocument('doc-1', 'admin-1', 'looks good');

    expect(runTransaction).toHaveBeenCalledTimes(1);
    expect(transactionUpdate).toHaveBeenCalled();
    expect(result.success).toBe(true);
  });

  it('rejects a KYC document and stores the rejection reason', async () => {
    documentSnapshots['doc-1'] = {
      userId: 'user-1',
      category: 'kyc',
      status: 'pending_review',
    };

    const result = await service.rejectDocument(
      'doc-1',
      'document mismatch',
      'admin-1',
    );

    expect(runTransaction).toHaveBeenCalledTimes(1);
    expect(transactionUpdate).toHaveBeenCalled();
    expect(result.success).toBe(true);
  });

  it('throws not found when generating access for a deleted or missing KYC document', async () => {
    documentsService.getById.mockResolvedValue(null);

    await expect(
      service.getSignedDocumentAccessUrl('missing-doc', 'user-1', 'borrower'),
    ).rejects.toThrow(NotFoundException);
  });
});
