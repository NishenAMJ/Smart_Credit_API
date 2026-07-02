import { BadRequestException, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';

import { MediaService } from './media.service';

describe('MediaService', () => {
  let service: MediaService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MediaService,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string) => {
              const values: Record<string, string> = {
                CLOUDINARY_CLOUD_NAME: 'demo-cloud',
                CLOUDINARY_API_KEY: 'key-123',
                CLOUDINARY_API_SECRET: 'secret-123',
              };

              return values[key];
            }),
          },
        },
      ],
    }).compile();

    service = module.get<MediaService>(MediaService);
    jest.restoreAllMocks();
  });

  it('validates supported profile picture mime types and size limits', () => {
    expect(() => service.validateProfilePicture('image/png', 1024)).not.toThrow();
    expect(() =>
      service.validateProfilePicture('application/pdf', 1024),
    ).toThrow(BadRequestException);
    expect(() =>
      service.validateProfilePicture('image/png', 4 * 1024 * 1024),
    ).toThrow(BadRequestException);
  });

  it('computes a stable sha-256 hash', () => {
    const hash = service.computeSha256(Buffer.from('hello world'));
    expect(hash).toBe(
      'b94d27b9934d3e08a52e52d7da7dabfac484efe37a5380ee9088f7ace2efcde9',
    );
  });

  it('maps upload responses from Cloudinary for sensitive documents', async () => {
    const fetchSpy = jest
      .spyOn(global, 'fetch')
      .mockResolvedValue(
        new Response(
          JSON.stringify({
            asset_id: 'asset-1',
            public_id: 'documents/user-1/kyc/doc-1',
            version: 123,
            format: 'pdf',
            bytes: 2048,
            resource_type: 'raw',
            type: 'authenticated',
            secure_url: 'https://example.com/doc.pdf',
            original_filename: 'nic-front',
            folder: 'documents/user-1/kyc',
          }),
          {
            status: 200,
            headers: {
              'Content-Type': 'application/json',
            },
          },
        ),
      );

    const payload = `data:application/pdf;base64,${Buffer.from('pdf-content').toString('base64')}`;
    const result = await service.uploadSensitiveDocumentFromDataUrl(
      'user-1',
      'kyc',
      'doc-1',
      payload,
      'nic-front',
    );

    expect(fetchSpy).toHaveBeenCalledTimes(1);
    expect(result.mimeType).toBe('application/pdf');
    expect(result.originalFilename).toBe('nic-front.pdf');
    expect(result.uploaded.publicId).toBe('documents/user-1/kyc/doc-1');
    expect(result.uploaded.deliveryType).toBe('authenticated');
  });

  it('generates a signed Cloudinary delivery URL for authenticated assets', () => {
    const url = service.generateSignedDeliveryUrl({
      publicId: 'documents/user-1/kyc/doc-1',
      resourceType: 'raw',
      deliveryType: 'authenticated',
      version: 123,
      format: 'pdf',
    });

    expect(url).toContain(
      'https://res.cloudinary.com/demo-cloud/raw/authenticated/s--',
    );
    expect(url).toContain('/v123/documents/user-1/kyc/doc-1.pdf');
  });

  it('throws a backend error when cloudinary upload fails', async () => {
    jest.spyOn(global, 'fetch').mockResolvedValue(
      new Response(
        JSON.stringify({
          error: {
            message: 'Upload rejected',
          },
        }),
        {
          status: 400,
          headers: {
            'Content-Type': 'application/json',
          },
        },
      ),
    );

    const payload = `data:image/png;base64,${Buffer.from('bad').toString('base64')}`;

    await expect(
      service.uploadProfilePictureFromDataUrl('user-1', payload),
    ).rejects.toThrow(InternalServerErrorException);
  });
});
