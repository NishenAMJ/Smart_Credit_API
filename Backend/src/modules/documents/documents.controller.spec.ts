import type { AuthenticatedRequest } from '../../common/types/authenticated-request';
import type { CompleteUploadDto } from './dto/documents.dto';
import { DocumentsController } from './documents.controller';

describe('DocumentsController', () => {
  const request = {
    user: { sub: 'lender-1', role: 'lender' },
  } as AuthenticatedRequest;

  const body: CompleteUploadDto = {
    publicId: 'documents/lender-1/dispute_evidence/evidence-new',
    assetId: 'asset-new',
    resourceType: 'image',
    deliveryType: 'authenticated',
    bytes: 2048,
    version: 2,
    secureUrl: 'https://cloudinary.test/evidence-new',
    format: 'png',
    fileHash: 'same-file-hash',
    originalFilename: 'evidence.png',
    mimeType: 'image/png',
    category: 'dispute_evidence',
    documentType: 'case_evidence',
    relatedEntityType: 'loan',
    relatedEntityId: 'loan-1',
    displayName: 'evidence.png',
  };

  it('reuses an existing dispute evidence record when a form submission is retried', async () => {
    const documentsService = {
      findDuplicate: jest.fn().mockResolvedValue({
        id: 'evidence-existing',
        status: 'pending_review',
        cloudinaryPublicId:
          'documents/lender-1/dispute_evidence/evidence-existing',
      }),
      createRecord: jest.fn(),
    };
    const mediaService = {
      ensureCloudinaryConfigured: jest.fn(),
      verifyCloudinaryAsset: jest.fn().mockResolvedValue({
        assetId: body.assetId,
        publicId: body.publicId,
        version: body.version,
        format: body.format,
        bytes: body.bytes,
        resourceType: body.resourceType,
        deliveryType: body.deliveryType,
        secureUrl: body.secureUrl,
        uploadedAt: '2026-08-22T00:00:00.000Z',
      }),
      deleteAsset: jest.fn().mockResolvedValue({ result: 'ok' }),
    };
    const controller = new DocumentsController(
      documentsService as never,
      mediaService as never,
    );

    await expect(controller.completeUpload(request, body)).resolves.toEqual({
      message: 'Existing evidence document reused successfully.',
      documentId: 'evidence-existing',
      status: 'pending_review',
    });
    expect(documentsService.createRecord).not.toHaveBeenCalled();
    expect(mediaService.deleteAsset).toHaveBeenCalledWith(
      body.publicId,
      'image',
      'authenticated',
    );
  });

  it('reuses the same payment receipt when upload completion is retried', async () => {
    const paymentBody: CompleteUploadDto = {
      ...body,
      publicId: 'documents/lender-1/payment_receipt/boost-receipt',
      category: 'payment_receipt',
      documentType: 'ad_boost_bank_receipt',
      relatedEntityType: 'ad_boost',
      relatedEntityId: 'boost-1',
    };
    const documentsService = {
      findDuplicate: jest.fn().mockResolvedValue({
        id: 'receipt-existing',
        status: 'pending_review',
        cloudinaryPublicId:
          'documents/lender-1/payment_receipt/previous-upload',
        relatedEntityType: paymentBody.relatedEntityType,
        relatedEntityId: paymentBody.relatedEntityId,
      }),
      createRecord: jest.fn(),
    };
    const mediaService = {
      ensureCloudinaryConfigured: jest.fn(),
      verifyCloudinaryAsset: jest.fn().mockResolvedValue({
        assetId: paymentBody.assetId,
        publicId: paymentBody.publicId,
        version: paymentBody.version,
        format: paymentBody.format,
        bytes: paymentBody.bytes,
        resourceType: paymentBody.resourceType,
        deliveryType: paymentBody.deliveryType,
        secureUrl: paymentBody.secureUrl,
        uploadedAt: '2026-08-24T00:00:00.000Z',
      }),
      deleteAsset: jest.fn().mockResolvedValue({ result: 'ok' }),
    };
    const controller = new DocumentsController(
      documentsService as never,
      mediaService as never,
    );

    await expect(
      controller.completeUpload(request, paymentBody),
    ).resolves.toEqual({
      message: 'Existing payment receipt reused successfully.',
      documentId: 'receipt-existing',
      status: 'pending_review',
    });
    expect(documentsService.createRecord).not.toHaveBeenCalled();
    expect(mediaService.deleteAsset).toHaveBeenCalledWith(
      paymentBody.publicId,
      'image',
      'authenticated',
    );
  });
});
