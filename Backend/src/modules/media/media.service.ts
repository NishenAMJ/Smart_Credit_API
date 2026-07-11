import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHash } from 'crypto';

import {
  PROFILE_PICTURE_MIME_TYPES,
  SENSITIVE_DOCUMENT_MIME_TYPES,
  type MediaResourceType,
  type UploadedMedia,
} from './media.types';

type DecodedDataUrl = {
  mimeType: string;
  buffer: Buffer;
  originalFilename: string;
  resourceType: MediaResourceType;
};

type CloudinaryUploadOptions = {
  folder: string;
  publicId: string;
  overwrite?: boolean;
  resourceType: MediaResourceType;
  deliveryType: 'upload' | 'authenticated';
};

type SignedUrlOptions = {
  publicId: string;
  resourceType: string;
  deliveryType: string;
  version?: number;
  format?: string;
};

@Injectable()
export class MediaService {
  private readonly cloudName?: string;
  private readonly apiKey?: string;
  private readonly apiSecret?: string;

  constructor(private readonly configService: ConfigService) {
    this.cloudName = this.configService.get<string>('CLOUDINARY_CLOUD_NAME');
    this.apiKey = this.configService.get<string>('CLOUDINARY_API_KEY');
    this.apiSecret = this.configService.get<string>('CLOUDINARY_API_SECRET');
  }

  ensureCloudinaryConfigured() {
    if (this.cloudName && this.apiKey && this.apiSecret) {
      return;
    }

    throw new InternalServerErrorException(
      'Cloudinary is not configured. Set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET.',
    );
  }

  decodeDataUrl(dataUrl: string, fallbackFilename: string): DecodedDataUrl {
    const matches = dataUrl.match(/^data:([A-Za-z0-9/+.-]+);base64,(.+)$/);
    if (!matches) {
      throw new BadRequestException('Invalid base64 file payload.');
    }

    const mimeType = matches[1];
    const base64Data = matches[2];
    const buffer = Buffer.from(base64Data, 'base64');

    return {
      mimeType,
      buffer,
      originalFilename: `${fallbackFilename}.${this.extensionForMimeType(mimeType)}`,
      resourceType: this.resourceTypeForMimeType(mimeType),
    };
  }

  validateProfilePicture(mimeType: string, sizeInBytes: number) {
    if (!PROFILE_PICTURE_MIME_TYPES.includes(mimeType as never)) {
      throw new BadRequestException(
        'Profile pictures must be JPG, PNG, or WEBP images.',
      );
    }

    if (sizeInBytes > 3 * 1024 * 1024) {
      throw new BadRequestException('Profile pictures must be 3 MB or smaller.');
    }
  }

  validateSensitiveDocument(mimeType: string, sizeInBytes: number) {
    if (!SENSITIVE_DOCUMENT_MIME_TYPES.includes(mimeType as never)) {
      throw new BadRequestException(
        'Documents must be PDF, JPG, PNG, or WEBP files.',
      );
    }

    if (sizeInBytes > 10 * 1024 * 1024) {
      throw new BadRequestException('Documents must be 10 MB or smaller.');
    }
  }

  computeSha256(buffer: Buffer) {
    return createHash('sha256').update(buffer).digest('hex');
  }

  async uploadProfilePictureFromDataUrl(userId: string, dataUrl: string) {
    this.ensureCloudinaryConfigured();
    const decoded = this.decodeDataUrl(dataUrl, 'avatar');
    this.validateProfilePicture(decoded.mimeType, decoded.buffer.length);

    return this.uploadBuffer(decoded.buffer, {
      folder: `profile-pictures/${userId}`,
      publicId: 'avatar',
      overwrite: true,
      resourceType: 'image',
      deliveryType: 'upload',
    });
  }

  async uploadSensitiveDocumentFromDataUrl(
    userId: string,
    category: 'kyc' | 'agreement',
    documentId: string,
    dataUrl: string,
    fileLabel: string,
  ) {
    this.ensureCloudinaryConfigured();
    const decoded = this.decodeDataUrl(dataUrl, fileLabel);
    this.validateSensitiveDocument(decoded.mimeType, decoded.buffer.length);

    const uploaded = await this.uploadBuffer(decoded.buffer, {
      folder: `documents/${userId}/${category}`,
      publicId: documentId,
      overwrite: false,
      resourceType: decoded.resourceType,
      deliveryType: 'authenticated',
    });

    return {
      uploaded,
      mimeType: decoded.mimeType,
      originalFilename: decoded.originalFilename,
      fileHash: this.computeSha256(decoded.buffer),
    };
  }

  generateSignedDeliveryUrl(options: SignedUrlOptions) {
    this.ensureCloudinaryConfigured();

    const versionSegment = options.version ? `v${options.version}` : undefined;
    const publicIdWithFormat = options.format
      ? `${options.publicId}.${options.format}`
      : options.publicId;
    const pathToSign = [versionSegment, publicIdWithFormat]
      .filter(Boolean)
      .join('/');
    const digest = createHash('sha1')
      .update(`${pathToSign}${this.apiSecret}`)
      .digest('base64')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/g, '')
      .slice(0, 8);
    const signedSegment = `s--${digest}--`;
    const deliveryPath = [
      options.resourceType,
      options.deliveryType,
      signedSegment,
      versionSegment,
      publicIdWithFormat,
    ]
      .filter(Boolean)
      .join('/');

    return `https://res.cloudinary.com/${this.cloudName}/${deliveryPath}`;
  }

  /**
   * Produces the signed parameters needed for a **client-side** direct upload to Cloudinary.
   * The client sends a multipart POST to `uploadUrl` with these parameters attached.
   * Default expiry: 5 minutes.
   */
  generateSignedUploadParams(options: {
    folder: string;
    publicId: string;
    resourceType: Exclude<MediaResourceType, 'auto'>;
    deliveryType: 'upload' | 'authenticated';
    ttlSeconds?: number;
  }): import('./media.types').DirectUploadIntent {
    this.ensureCloudinaryConfigured();

    const ttl = options.ttlSeconds ?? 300; // 5 minutes default
    const timestamp = Math.floor(Date.now() / 1000) + ttl;

    const sigParams: Record<string, string> = {
      folder: options.folder,
      public_id: options.publicId,
      timestamp: String(timestamp),
      type: options.deliveryType,
    };

    const signature = this.createUploadSignature(sigParams);

    return {
      category: options.folder.split('/')[0] as import('./media.types').MediaUploadCategory,
      publicId: options.publicId,
      folder: options.folder,
      resourceType: options.resourceType,
      deliveryType: options.deliveryType,
      uploadUrl: `https://api.cloudinary.com/v1_1/${this.cloudName}/${options.resourceType}/upload`,
      cloudName: this.cloudName as string,
      apiKey: this.apiKey as string,
      timestamp,
      signature,
      expiresAt: new Date((timestamp) * 1000).toISOString(),
    };
  }

  /**
   * Calls the Cloudinary Admin API to verify that an asset with the given `publicId` exists
   * and returns its metadata. Used after a client-side upload to confirm ownership.
   */
  async verifyCloudinaryAsset(
    publicId: string,
    resourceType: 'image' | 'raw' | 'video' = 'image',
    deliveryType: 'upload' | 'authenticated' = 'authenticated',
  ): Promise<UploadedMedia | null> {
    this.ensureCloudinaryConfigured();

    const timestamp = Math.floor(Date.now() / 1000);
    const signature = this.createUploadSignature({
      public_id: publicId,
      timestamp: String(timestamp),
      type: deliveryType,
    });

    const params = new URLSearchParams({
      public_id: publicId,
      timestamp: String(timestamp),
      type: deliveryType,
      api_key: this.apiKey as string,
      signature,
    });

    const response = await fetch(
      `https://api.cloudinary.com/v1_1/${this.cloudName}/resources/${resourceType}/${deliveryType}/${encodeURIComponent(publicId)}`,
      {
        headers: {
          Authorization: `Basic ${Buffer.from(`${this.apiKey}:${this.apiSecret}`).toString('base64')}`,
        },
      },
    );

    // suppress unused variable
    void params;

    if (response.status === 404) {
      return null;
    }

    if (!response.ok) {
      throw new InternalServerErrorException('Failed to verify Cloudinary asset.');
    }

    const payload = (await response.json()) as Record<string, unknown>;

    return {
      assetId: String(payload.asset_id ?? ''),
      publicId: String(payload.public_id ?? publicId),
      version: Number(payload.version ?? 0),
      format: typeof payload.format === 'string' ? payload.format : undefined,
      bytes: Number(payload.bytes ?? 0),
      resourceType: String(payload.resource_type ?? resourceType),
      deliveryType: String(payload.type ?? deliveryType),
      secureUrl: String(payload.secure_url ?? ''),
      originalFilename:
        typeof payload.original_filename === 'string'
          ? payload.original_filename
          : undefined,
      folder: typeof payload.folder === 'string' ? payload.folder : undefined,
      uploadedAt: new Date().toISOString(),
    };
  }

  /**
   * Uploads a raw Buffer to Cloudinary as an authenticated `raw` document (PDF).
   * Used by backend services (e.g. LegalService) that generate files server-side.
   */
  async uploadBufferAsDocument(
    buffer: Buffer,
    options: {
      folder: string;
      publicId: string;
      resourceType: Exclude<MediaResourceType, 'auto'>;
      deliveryType: 'upload' | 'authenticated';
      overwrite?: boolean;
    },
  ): Promise<UploadedMedia> {
    this.ensureCloudinaryConfigured();
    return this.uploadBuffer(buffer, options);
  }

  async deleteAsset(
    publicId: string,
    resourceType: 'image' | 'raw' | 'video' = 'image',
    deliveryType: 'upload' | 'authenticated' = 'upload',
  ) {
    this.ensureCloudinaryConfigured();

    const timestamp = Math.floor(Date.now() / 1000);
    const signature = this.createUploadSignature({
      public_id: publicId,
      timestamp: String(timestamp),
      type: deliveryType,
      invalidate: 'true',
    });

    const body = new URLSearchParams({
      public_id: publicId,
      timestamp: String(timestamp),
      type: deliveryType,
      invalidate: 'true',
      api_key: this.apiKey as string,
      signature,
    });

    const response = await fetch(
      `https://api.cloudinary.com/v1_1/${this.cloudName}/${resourceType}/destroy`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body,
      },
    );

    const payload = (await response.json()) as Record<string, unknown>;

    if (!response.ok) {
      const message =
        typeof payload.error === 'object' &&
        payload.error &&
        'message' in payload.error &&
        typeof payload.error.message === 'string'
          ? payload.error.message
          : 'Cloudinary delete failed.';
      throw new InternalServerErrorException(message);
    }

    return payload;
  }

  private extensionForMimeType(mimeType: string) {
    switch (mimeType) {
      case 'image/jpeg':
        return 'jpg';
      case 'image/png':
        return 'png';
      case 'image/webp':
        return 'webp';
      case 'application/pdf':
        return 'pdf';
      default:
        return 'bin';
    }
  }

  private resourceTypeForMimeType(mimeType: string): MediaResourceType {
    if (mimeType.startsWith('image/')) {
      return 'image';
    }

    if (mimeType === 'application/pdf') {
      return 'raw';
    }

    return 'auto';
  }

  private async uploadBuffer(
    buffer: Buffer,
    options: CloudinaryUploadOptions,
  ): Promise<UploadedMedia> {
    const timestamp = Math.floor(Date.now() / 1000);
    const signature = this.createUploadSignature({
      folder: options.folder,
      overwrite: options.overwrite ? 'true' : 'false',
      public_id: options.publicId,
      timestamp: String(timestamp),
      type: options.deliveryType,
    });

    const formData = new FormData();
    formData.append(
      'file',
      new Blob([new Uint8Array(buffer)]),
      `${options.publicId}.${options.resourceType === 'raw' ? 'pdf' : 'bin'}`,
    );
    formData.append('api_key', this.apiKey as string);
    formData.append('folder', options.folder);
    formData.append('overwrite', options.overwrite ? 'true' : 'false');
    formData.append('public_id', options.publicId);
    formData.append('signature', signature);
    formData.append('timestamp', String(timestamp));
    formData.append('type', options.deliveryType);

    const response = await fetch(
      `https://api.cloudinary.com/v1_1/${this.cloudName}/${options.resourceType}/upload`,
      {
        method: 'POST',
        body: formData,
      },
    );

    const payload = (await response.json()) as Record<string, unknown>;

    if (!response.ok) {
      const message =
        typeof payload.error === 'object' &&
        payload.error &&
        'message' in payload.error &&
        typeof payload.error.message === 'string'
          ? payload.error.message
          : 'Cloudinary upload failed.';
      throw new InternalServerErrorException(message);
    }

    return {
      assetId: String(payload.asset_id ?? ''),
      publicId: String(payload.public_id ?? ''),
      version: Number(payload.version ?? 0),
      format:
        typeof payload.format === 'string' ? payload.format : undefined,
      bytes: Number(payload.bytes ?? 0),
      resourceType: String(payload.resource_type ?? options.resourceType),
      deliveryType: String(payload.type ?? options.deliveryType),
      secureUrl: String(payload.secure_url ?? ''),
      originalFilename:
        typeof payload.original_filename === 'string'
          ? payload.original_filename
          : undefined,
      folder: typeof payload.folder === 'string' ? payload.folder : undefined,
      uploadedAt: new Date().toISOString(),
    };
  }

  private createUploadSignature(params: Record<string, string>) {
    const serialized = Object.entries(params)
      .filter(([, value]) => value !== undefined && value !== '')
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, value]) => `${key}=${value}`)
      .join('&');

    return createHash('sha1')
      .update(`${serialized}${this.apiSecret}`)
      .digest('hex');
  }
}
