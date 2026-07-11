import {
  BadRequestException,
  Body,
  Controller,
  ForbiddenException,
  Get,
  NotFoundException,
  Param,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';

import type { AuthenticatedRequest } from '../../common/types/authenticated-request';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { DocumentsService } from './documents.service';
import { MediaService } from '../media/media.service';
import type { DocumentRelatedEntityType } from './interfaces/document-record.interface';
import type {
  CompleteUploadDto,
  DocumentAccessResponseDto,
  InitUploadDto,
  InitUploadResponseDto,
  CompleteUploadResponseDto,
} from './dto/documents.dto';

/** TTL for signed delivery URLs in seconds (5 minutes). */
const SIGNED_URL_TTL_SECONDS = 300;

@Controller('documents')
@UseGuards(JwtAuthGuard)
export class DocumentsController {
  constructor(
    private readonly documentsService: DocumentsService,
    private readonly mediaService: MediaService,
  ) {}

  // ─── POST /documents/uploads/init ─────────────────────────────────────────

  /**
   * Generates signed Cloudinary upload parameters for a client-side direct upload.
   * The client must then POST the file directly to Cloudinary using these params,
   * then call `POST /documents/uploads/complete` to create the Firestore record.
   */
  @Post('uploads/init')
  async initUpload(
    @Req() req: AuthenticatedRequest,
    @Body() body: InitUploadDto,
  ): Promise<InitUploadResponseDto> {
    this.mediaService.ensureCloudinaryConfigured();

    const userId = req.user.sub;
    const category = body.category;

    if (!['kyc', 'agreement'].includes(category)) {
      throw new BadRequestException('category must be "kyc" or "agreement".');
    }

    // Derive a stable publicId from the fileName (strip extension, sanitise).
    const safeBase = body.fileName
      .replace(/\.[^.]+$/, '')
      .replace(/[^a-zA-Z0-9_-]/g, '_')
      .slice(0, 80);
    const publicId = `${safeBase}_${Date.now()}`;
    const folder = `documents/${userId}/${category}`;

    // Images → 'image', PDFs → 'raw'
    const resourceType =
      body.contentType === 'application/pdf' ? 'raw' : 'image';

    const intent = this.mediaService.generateSignedUploadParams({
      folder,
      publicId,
      resourceType,
      deliveryType: 'authenticated',
    });

    return {
      publicId: intent.publicId,
      uploadUrl: intent.uploadUrl,
      cloudName: intent.cloudName,
      apiKey: intent.apiKey,
      timestamp: intent.timestamp,
      signature: intent.signature,
      folder: intent.folder,
      resourceType: intent.resourceType,
      deliveryType: intent.deliveryType,
      expiresAt: intent.expiresAt,
    };
  }

  // ─── POST /documents/uploads/complete ─────────────────────────────────────

  /**
   * Called by the client after a successful direct upload to Cloudinary.
   * Verifies the asset exists on Cloudinary, checks for duplicate hashes,
   * then creates the Firestore `documents` record.
   */
  @Post('uploads/complete')
  async completeUpload(
    @Req() req: AuthenticatedRequest,
    @Body() body: CompleteUploadDto,
  ): Promise<CompleteUploadResponseDto> {
    this.mediaService.ensureCloudinaryConfigured();

    const userId = req.user.sub;

    // Verify the asset actually exists on Cloudinary before trusting client data.
    const verified = await this.mediaService.verifyCloudinaryAsset(
      body.publicId,
      body.resourceType as 'image' | 'raw',
      body.deliveryType as 'upload' | 'authenticated',
    );

    if (!verified) {
      throw new BadRequestException(
        'Cloudinary asset not found. Complete the upload before calling this endpoint.',
      );
    }

    // Duplicate-hash guard.
    const duplicate = await this.documentsService.findDuplicate(
      userId,
      body.fileHash,
      body.category,
    );

    if (duplicate) {
      throw new BadRequestException(
        `A document with the same file content already exists (id: ${duplicate.id}).`,
      );
    }

    const uploadedMedia = {
      assetId: body.assetId,
      publicId: body.publicId,
      version: body.version,
      format: body.format,
      bytes: body.bytes,
      resourceType: body.resourceType,
      deliveryType: body.deliveryType,
      secureUrl: body.secureUrl,
      uploadedAt: new Date().toISOString(),
    };

    const record = await this.documentsService.createRecord({
      userId,
      category: body.category,
      documentType: body.documentType,
      originalFilename: body.originalFilename,
      mimeType: body.mimeType,
      fileHash: body.fileHash,
      source: 'user_upload',
      relatedEntityType: body.relatedEntityType as DocumentRelatedEntityType | undefined,
      relatedEntityId: body.relatedEntityId,
      displayName: body.displayName,
      uploadedMedia,
    });

    return {
      message: 'Document record created successfully.',
      documentId: record!.id,
      status: record!.status,
    };
  }

  // ─── GET /documents/:documentId/access ────────────────────────────────────

  /**
   * Returns a short-lived (5-minute) signed Cloudinary URL for the requested document.
   * The caller must own the document or be an admin.
   */
  @Get(':documentId/access')
  async getDocumentAccess(
    @Req() req: AuthenticatedRequest,
    @Param('documentId') documentId: string,
  ): Promise<DocumentAccessResponseDto> {
    const { sub: requesterId, role } = req.user;

    const document = await this.documentsService.getById(documentId);

    if (!document || document.status === 'deleted') {
      throw new NotFoundException('Document not found.');
    }

    // Soft-deleted / rejected documents are blocked for non-admins.
    if (document.status === 'rejected' && role !== 'admin') {
      throw new ForbiddenException('Access to this document has been denied.');
    }

    // Ownership check – admins bypass.
    if (role !== 'admin' && document.userId !== requesterId) {
      throw new ForbiddenException(
        'You do not have access to this document.',
      );
    }

    const expiresAt = new Date(
      Date.now() + SIGNED_URL_TTL_SECONDS * 1000,
    ).toISOString();

    const accessUrl = this.mediaService.generateSignedDeliveryUrl({
      publicId: document.cloudinaryPublicId,
      resourceType: document.cloudinaryResourceType,
      deliveryType: document.cloudinaryDeliveryType,
      version: document.cloudinaryVersion,
      format: document.format,
    });

    return { documentId, accessUrl, expiresAt };
  }
}
