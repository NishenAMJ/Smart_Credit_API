import {
  BadRequestException,
  ConflictException,
  HttpException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import * as admin from 'firebase-admin';

import { FirebaseService } from '../../firebase/firebase.service';
import { rethrowFirebaseError } from '../../common/firebase-error';
import { removeUndefinedDeep } from '../../common/remove-undefined.deep';
import { AuthService } from '../auth/auth.service';
import type { UserDocument, UserRole } from '../auth/auth.types';
import { DocumentsService } from '../documents/documents.service';
import type { DocumentRecord } from '../documents/interfaces/document-record.interface';
import { MediaService } from '../media/media.service';
import type { KycDocument } from './interfaces/kyc-document.interface';
import { SubmitKycDto } from './dto/submit-kyc.dto';

type KycUploadField = {
  documentType: 'nic_front' | 'nic_back' | 'address_proof' | 'bank_document';
  label: string;
  dataUrl: string;
};

type KycPayloadFieldKey =
  | 'nicFrontDataUrl'
  | 'nicBackDataUrl'
  | 'documentFrontUrl'
  | 'documentBackUrl'
  | 'addressProofDataUrl'
  | 'bankDocumentDataUrl'
  | 'profilePhotoUrl'
  | 'profilePictureUrl'
  | 'selfieUrl';

type ExistingKycUser = Partial<UserDocument> & {
  nic?: string;
  dateOfBirth?: string;
};

@Injectable()
export class KycService {
  private static readonly DEFAULT_PAGE_SIZE = 20;
  private static readonly MAX_PAGE_SIZE = 50;

  constructor(
    private readonly firebaseService: FirebaseService,
    private readonly authService: AuthService,
    private readonly documentsService: DocumentsService,
    private readonly mediaService: MediaService,
  ) {}

  private get db() {
    return this.firebaseService.db;
  }

  // Converts the generic document record shape into the smaller KYC response format.
  private mapDocumentToKycDocument(document: DocumentRecord): KycDocument {
    const status =
      document.status === 'pending_review'
        ? 'pending'
        : document.status === 'approved'
          ? 'approved'
          : 'rejected';

    return {
      id: document.id,
      userId: document.userId,
      fullName: document.fullName,
      email: document.email,
      phone: document.phone,
      userKycStatus: document.userKycStatus,
      documentType: document.documentType,
      originalFilename: document.originalFilename,
      mimeType: document.mimeType,
      fileHash: document.fileHash,
      cloudinaryAssetId: document.cloudinaryAssetId,
      cloudinaryPublicId: document.cloudinaryPublicId,
      cloudinaryResourceType: document.cloudinaryResourceType,
      cloudinaryDeliveryType: document.cloudinaryDeliveryType,
      cloudinaryVersion: document.cloudinaryVersion,
      format: document.format,
      fileSize: document.fileSize,
      status,
      documentStatus: document.status,
      submittedAt: document.uploadedAt,
      reviewedAt: document.review?.reviewedAt,
      reviewedBy: document.review?.reviewedBy,
      reviewerId: document.reviewerId,
      reviewTimestamp: document.reviewTimestamp,
      reviewNotes: document.reviewNotes,
      rejectionReason: document.review?.rejectionReason,
      notes: document.review?.notes,
    };
  }

  // Applies min/max paging rules so the endpoint stays predictable and safe.
  private parseLimit(limit?: string) {
    const parsed = Number(limit ?? KycService.DEFAULT_PAGE_SIZE);
    if (!Number.isFinite(parsed)) {
      return KycService.DEFAULT_PAGE_SIZE;
    }

    return Math.min(Math.max(Math.trunc(parsed), 1), KycService.MAX_PAGE_SIZE);
  }

  private normalizeEmail(email: string): string {
    return email.trim().toLowerCase();
  }

  // Reuses the same phone normalization approach as auth so lookups stay consistent.
  private normalizePhone(phone: string): string {
    const raw = phone.trim();
    const digitsAndPlus = raw.replace(/[^\d+]/g, '');
    let normalized = digitsAndPlus;

    if (normalized.startsWith('+')) {
      normalized = `+${normalized.slice(1).replace(/\D/g, '')}`;
    } else {
      normalized = normalized.replace(/\D/g, '');

      if (normalized.startsWith('0')) {
        normalized = `+94${normalized.slice(1)}`;
      } else if (normalized.startsWith('94')) {
        normalized = `+${normalized}`;
      } else if (normalized.length === 9) {
        normalized = `+94${normalized}`;
      } else {
        normalized = `+${normalized}`;
      }
    }

    if (!/^\+\d{9,15}$/.test(normalized)) {
      throw new BadRequestException('Please provide a valid phone number.');
    }

    return normalized;
  }

  private firstDefined(
    dto: SubmitKycDto,
    keys: KycPayloadFieldKey[],
  ): string | undefined {
    for (const key of keys) {
      const value = dto[key];
      if (typeof value === 'string' && value.trim()) {
        return value.trim();
      }
    }

    return undefined;
  }

  private resolveOptionalField(
    dto: SubmitKycDto,
    field: keyof SubmitKycDto,
    fallback?: string,
  ): string | undefined {
    const value = dto[field];

    if (typeof value === 'string' && value.trim()) {
      return value.trim();
    }

    if (typeof fallback === 'string' && fallback.trim()) {
      return fallback.trim();
    }

    return undefined;
  }

  // Defines the KYC files the mobile flow expects and how each one is labeled in storage.
  private buildUploadFields(dto: SubmitKycDto): KycUploadField[] {
    const fields: Array<KycUploadField | null> = [
      this.firstDefined(dto, ['nicFrontDataUrl', 'documentFrontUrl'])
        ? {
            documentType: 'nic_front',
            label: 'nic-front',
            dataUrl: this.firstDefined(dto, [
              'nicFrontDataUrl',
              'documentFrontUrl',
            ]) as string,
          }
        : null,
      this.firstDefined(dto, ['nicBackDataUrl', 'documentBackUrl'])
        ? {
            documentType: 'nic_back',
            label: 'nic-back',
            dataUrl: this.firstDefined(dto, [
              'nicBackDataUrl',
              'documentBackUrl',
            ]) as string,
          }
        : null,
      this.firstDefined(dto, ['addressProofDataUrl'])
        ? {
            documentType: 'address_proof',
            label: 'address-proof',
            dataUrl: this.firstDefined(dto, ['addressProofDataUrl']) as string,
          }
        : null,
      this.firstDefined(dto, ['bankDocumentDataUrl'])
        ? {
            documentType: 'bank_document',
            label: 'bank-document',
            dataUrl: this.firstDefined(dto, ['bankDocumentDataUrl']) as string,
          }
        : null,
    ];

    const requiredMissing: string[] = [];
    if (!this.firstDefined(dto, ['nicFrontDataUrl', 'documentFrontUrl'])) {
      requiredMissing.push('nicFrontDataUrl');
    }
    if (!this.firstDefined(dto, ['nicBackDataUrl', 'documentBackUrl'])) {
      requiredMissing.push('nicBackDataUrl');
    }

    if (requiredMissing.length > 0) {
      throw new BadRequestException(
        `Missing required KYC file payloads: ${requiredMissing.join(', ')}.`,
      );
    }

    return fields.filter(Boolean) as KycUploadField[];
  }

  // Non-admins may only access their own KYC files.
  private assertDocumentAccess(
    document: DocumentRecord,
    requesterId: string,
    requesterRole: UserRole,
  ) {
    if (requesterRole === 'admin') {
      return;
    }

    if (document.userId === requesterId) {
      return;
    }

    throw new ForbiddenException('You do not have access to this KYC document.');
  }

  // Ensures the requested document exists, belongs to the KYC category, and has not been deleted.
  private async getRequiredKycDocument(
    documentId: string,
    requesterRole?: UserRole,
  ) {
    const document = await this.documentsService.getById(documentId);

    if (!document || document.category !== 'kyc') {
      throw new NotFoundException('KYC document not found');
    }

    if (document.status === 'deleted') {
      throw new NotFoundException('KYC document not found');
    }

    if (document.status === 'rejected' && requesterRole !== 'admin') {
      throw new ForbiddenException(
        'Access to this KYC document has been denied.',
      );
    }

    return document;
  }

  private async uploadKycDocument(
    userId: string,
    field: KycUploadField,
    existingUser?: ExistingKycUser | null,
  ): Promise<DocumentRecord> {
    const prepared = this.mediaService.decodeDataUrl(
      field.dataUrl,
      field.label,
    );
    this.mediaService.validateSensitiveDocument(
      prepared.mimeType,
      prepared.buffer.length,
    );

    const fileHash = this.mediaService.computeSha256(prepared.buffer);
    const duplicate = await this.documentsService.findDuplicate(
      userId,
      fileHash,
      'kyc',
    );

    if (duplicate) {
      throw new BadRequestException(
        `Duplicate KYC document detected for ${field.documentType}.`,
      );
    }

    const uploadedMedia = await this.mediaService.uploadBufferAsDocument(
      prepared.buffer,
      {
        folder: `documents/${userId}/kyc/${field.documentType}`,
        publicId: `${field.documentType}-${Date.now()}-${fileHash.slice(0, 8)}`,
        overwrite: false,
        resourceType:
          prepared.resourceType === 'image' ? 'image' : 'raw',
        deliveryType: 'authenticated',
      },
    );

    return this.documentsService.createRecord({
      userId,
      fullName: existingUser?.fullName,
      email: existingUser?.email,
      phone: existingUser?.phone,
      userKycStatus: existingUser?.kycStatus,
      category: 'kyc',
      documentType: field.documentType,
      originalFilename: prepared.originalFilename,
      mimeType: prepared.mimeType,
      fileHash,
      uploadedMedia,
    });
  }

  // Handles the mobile onboarding flow: uploads media, stores document metadata, and creates/updates the user profile.
  async submitMobileKyc(dto: SubmitKycDto, authenticatedUserId?: string) {
    const createdDocuments: DocumentRecord[] = [];
    const userId =
      authenticatedUserId ?? dto.userId ?? this.db.collection('users').doc().id;

    try {
      this.mediaService.ensureCloudinaryConfigured();

      const userRef = this.db.collection('users').doc(userId);
      const userSnapshot = await userRef.get();
      const existingUser = userSnapshot.exists
        ? (userSnapshot.data() as ExistingKycUser)
        : null;
      const fullName = this.resolveOptionalField(
        dto,
        'fullName',
        existingUser?.fullName,
      );
      const email = this.resolveOptionalField(
        dto,
        'email',
        existingUser?.email,
      );
      const phoneNumber = this.resolveOptionalField(
        dto,
        'phoneNumber',
        existingUser?.phone,
      );
      const nic = this.resolveOptionalField(dto, 'nic', existingUser?.nic);
      const birthDate = this.resolveOptionalField(
        dto,
        'birthDate',
        existingUser?.dateOfBirth,
      );
      const passwordHash = this.resolveOptionalField(
        dto,
        'passwordHash',
        existingUser?.passwordHash,
      );

      const documentRefs: Record<string, string> = {};
      const documentIds: string[] = [];

      for (const field of this.buildUploadFields(dto)) {
        const record = await this.uploadKycDocument(userId, field, existingUser);
        documentRefs[field.documentType] = record.id;
        documentIds.push(record.id);
        createdDocuments.push(record);
      }

      const profilePhotoSource = this.firstDefined(dto, [
        'profilePhotoUrl',
        'profilePictureUrl',
        'selfieUrl',
      ]);
      let profilePhotoUrl = profilePhotoSource ?? '';
      let profilePictureData: any = null;

      if (profilePhotoSource?.startsWith('data:')) {
        const profileUpload = await this.mediaService.uploadProfilePictureFromDataUrl(
          userId,
          profilePhotoSource,
        );
        profilePhotoUrl = profileUpload.secureUrl;
        profilePictureData = {
          cloudinaryPublicId: profileUpload.publicId,
          secureUrl: profileUpload.secureUrl,
          version: profileUpload.version,
          format: profileUpload.format ?? null,
          fileSize: profileUpload.bytes,
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        };
      }

      await userRef.set(
        removeUndefinedDeep({
          uid: userId,
          role: [dto.role],
          ...(fullName ? { fullName } : {}),
          ...(email
            ? { email: email.toLowerCase(), emailLower: this.normalizeEmail(email) }
            : {}),
          ...(phoneNumber
            ? {
                phone: phoneNumber,
                phoneNormalized: this.normalizePhone(phoneNumber),
              }
            : {}),
          ...(nic ? { nic } : {}),
          ...(birthDate ? { dateOfBirth: birthDate } : {}),
          photoURL: profilePhotoUrl,
          profilePicture: profilePictureData,
          ...(passwordHash ? { passwordHash } : {}),
          creditScore: 0,
          rating: 0,
          totalLoansCompleted: 0,
          totalAmountLent: 0,
          totalAmountBorrowed: 0,
          kycStatus: 'pending',
          accountStatus: 'active',
          authProvider: 'local',
          notes: '',
          rejectionReason: '',
          kycFiles: {
            addressProofNumber: dto.addressProofNumber,
            bankAccountNumber: dto.bankAccountNumber ?? '',
            bankName: dto.bankName ?? '',
            branchCode: dto.branchCode ?? '',
            accountType: dto.accountType ?? '',
            documentRefs,
            submittedAt: admin.firestore.FieldValue.serverTimestamp(),
          },
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        }),
        { merge: true },
      );

      return {
        success: true,
        userId,
        kycStatus: 'pending',
        documentIds,
        message: 'KYC submitted successfully',
      };
    } catch (error) {
      for (const document of createdDocuments) {
        try {
          await this.mediaService.deleteAsset(
            document.cloudinaryPublicId,
            document.cloudinaryResourceType as 'image' | 'raw' | 'video',
            document.cloudinaryDeliveryType as 'upload' | 'authenticated',
          );
        } catch {
          // Cleanup is best-effort; keep rolling back the rest.
        }

        try {
          await this.documentsService.softDelete(
            document.id,
            userId,
            'KYC submission rolled back after failure',
          );
        } catch {
          // Same best-effort rule for metadata cleanup.
        }
      }

      if (error instanceof HttpException) {
        throw error;
      }

      console.error('Error submitting mobile KYC:', error);
      rethrowFirebaseError(error, 'Failed to submit KYC');
    }
  }

  // Returns the admin review queue for KYC documents.
  async getPendingKyc(limit?: string, cursor?: string) {
    try {
      const pageSize = this.parseLimit(limit);
      const result = await this.documentsService.getPendingReview(pageSize, cursor);

      return {
        success: true,
        count: result.documents.length,
        documents: result.documents.map((doc) => this.mapDocumentToKycDocument(doc)),
        hasMore: result.hasMore,
        nextCursor: result.nextCursor,
      };
    } catch (error) {
      console.error('Error fetching pending KYC documents:', error);
      rethrowFirebaseError(error, 'Failed to fetch pending KYC documents');
    }
  }

  // Lists all KYC documents submitted by a specific user.
  async getUserDocuments(userId: string) {
    try {
      const documents = await this.documentsService.listByUser(userId, 'kyc');

      return {
        success: true,
        count: documents.length,
        documents: documents.map((doc) => this.mapDocumentToKycDocument(doc)),
      };
    } catch (error) {
      console.error('Error fetching user KYC documents:', error);
      rethrowFirebaseError(error, 'Failed to fetch user KYC documents');
    }
  }

  // Approves a document and mirrors that result back onto the user's profile.
  async approveDocument(documentId: string, reviewedBy?: string, notes?: string) {
    try {
      const documentRef = this.db.collection('documents').doc(documentId);
      const reviewTimestamp = admin.firestore.FieldValue.serverTimestamp();
      const result = await this.db.runTransaction(async (transaction) => {
        const snapshot = await transaction.get(documentRef);
        if (!snapshot.exists) {
          throw new NotFoundException('KYC document not found');
        }

        const document = {
          ...(snapshot.data() as Omit<DocumentRecord, 'id'>),
          id: snapshot.id,
        } as DocumentRecord;

        if (document.category !== 'kyc' || document.status === 'deleted') {
          throw new NotFoundException('KYC document not found');
        }

        if (document.status !== 'pending_review') {
          throw new ConflictException('This KYC document has already been reviewed.');
        }

        const reviewNotes = notes?.trim() ?? '';
        const userRef = this.db.collection('users').doc(document.userId);

        transaction.update(documentRef, {
          status: 'approved',
          reviewerId: reviewedBy ?? null,
          reviewTimestamp,
          reviewNotes,
          reviewedAt: reviewTimestamp,
          reviewedBy: reviewedBy ?? null,
          notes: reviewNotes,
          rejectionReason: '',
          updatedAt: reviewTimestamp,
          review: {
            reviewedAt: reviewTimestamp,
            reviewedBy: reviewedBy ?? null,
            notes: reviewNotes,
            rejectionReason: '',
          },
        });

        transaction.update(userRef, {
          kycStatus: 'approved',
          reviewedAt: reviewTimestamp,
          reviewedBy: reviewedBy ?? null,
          rejectionReason: '',
          notes: reviewNotes,
          updatedAt: reviewTimestamp,
        });

        return { userId: document.userId };
      });

      return {
        success: true,
        message: 'KYC document approved successfully',
        documentId,
        userId: result.userId,
        status: 'approved',
        userKycStatus: 'approved',
      };
    } catch (error) {
      if (
        error instanceof NotFoundException ||
        error instanceof ConflictException
      ) {
        throw error;
      }

      console.error('Error approving KYC document:', error);
      rethrowFirebaseError(error, 'Failed to approve KYC document');
    }
  }

  // Rejects a document and stores the rejection reason on both the document and user profile.
  async rejectDocument(documentId: string, reason: string, reviewedBy?: string) {
    try {
      const documentRef = this.db.collection('documents').doc(documentId);
      const reviewTimestamp = admin.firestore.FieldValue.serverTimestamp();
      const rejectionReason = reason.trim();
      const result = await this.db.runTransaction(async (transaction) => {
        const snapshot = await transaction.get(documentRef);
        if (!snapshot.exists) {
          throw new NotFoundException('KYC document not found');
        }

        const document = {
          ...(snapshot.data() as Omit<DocumentRecord, 'id'>),
          id: snapshot.id,
        } as DocumentRecord;

        if (document.category !== 'kyc' || document.status === 'deleted') {
          throw new NotFoundException('KYC document not found');
        }

        if (document.status !== 'pending_review') {
          throw new ConflictException('This KYC document has already been reviewed.');
        }

        const userRef = this.db.collection('users').doc(document.userId);

        transaction.update(documentRef, {
          status: 'rejected',
          reviewerId: reviewedBy ?? null,
          reviewTimestamp,
          reviewNotes: rejectionReason,
          reviewedAt: reviewTimestamp,
          reviewedBy: reviewedBy ?? null,
          notes: rejectionReason,
          rejectionReason,
          updatedAt: reviewTimestamp,
          review: {
            reviewedAt: reviewTimestamp,
            reviewedBy: reviewedBy ?? null,
            notes: rejectionReason,
            rejectionReason,
          },
        });

        transaction.update(userRef, {
          kycStatus: 'rejected',
          reviewedAt: reviewTimestamp,
          reviewedBy: reviewedBy ?? null,
          rejectionReason,
          notes: rejectionReason,
          updatedAt: reviewTimestamp,
        });

        return { userId: document.userId };
      });

      return {
        success: true,
        message: 'KYC document rejected successfully',
        documentId,
        userId: result.userId,
        status: 'rejected',
        userKycStatus: 'rejected',
      };
    } catch (error) {
      if (
        error instanceof NotFoundException ||
        error instanceof ConflictException
      ) {
        throw error;
      }

      console.error('Error rejecting KYC document:', error);
      rethrowFirebaseError(error, 'Failed to reject KYC document');
    }
  }

  // Generates a signed delivery URL so documents stay private while still being viewable when authorized.
  async getSignedDocumentAccessUrl(
    documentId: string,
    requesterId: string,
    requesterRole: UserRole,
  ) {
    try {
      const document = await this.getRequiredKycDocument(documentId, requesterRole);
      this.assertDocumentAccess(document, requesterId, requesterRole);

      return {
        success: true,
        documentId,
        accessUrl: this.mediaService.generateSignedDeliveryUrl({
          publicId: document.cloudinaryPublicId,
          resourceType: document.cloudinaryResourceType,
          deliveryType: document.cloudinaryDeliveryType,
          version: document.cloudinaryVersion,
          format: document.format,
        }),
      };
    } catch (error) {
      if (
        error instanceof NotFoundException ||
        error instanceof ForbiddenException
      ) {
        throw error;
      }

      console.error('Error generating KYC document access URL:', error);
      rethrowFirebaseError(error, 'Failed to generate KYC document access URL');
    }
  }
}
