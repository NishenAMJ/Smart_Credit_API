import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import * as admin from 'firebase-admin';

import { FirebaseService } from '../../firebase/firebase.service';
import { rethrowFirebaseError } from '../../common/firebase-error';
import { AuthService } from '../auth/auth.service';
import type { UserRole } from '../auth/auth.types';
import { DocumentsService } from '../documents/documents.service';
import type { DocumentRecord } from '../documents/interfaces/document-record.interface';
import { MediaService } from '../media/media.service';
import type { KycDocument } from './interfaces/kyc-document.interface';
import { SubmitKycDto } from './dto/submit-kyc.dto';

type KycUploadField = {
  documentType: 'nic_front' | 'nic_back' | 'address_proof' | 'bank_document';
  label: string;
  documentId: string;
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
    return {
      id: document.id,
      userId: document.userId,
      documentType: document.documentType,
      originalFilename: document.originalFilename,
      mimeType: document.mimeType,
      fileHash: document.fileHash,
      cloudinaryPublicId: document.cloudinaryPublicId,
      cloudinaryResourceType: document.cloudinaryResourceType,
      cloudinaryDeliveryType: document.cloudinaryDeliveryType,
      status: document.status,
      submittedAt: document.uploadedAt,
      reviewedAt: document.review?.reviewedAt,
      reviewedBy: document.review?.reviewedBy,
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

  // Defines the KYC files the mobile flow expects and how each one is labeled in storage.
  private buildUploadFields(dto: SubmitKycDto): KycUploadField[] {
    return [
      {
        documentType: 'nic_front',
        label: 'nic-front',
        documentId: dto.nicFrontDocumentId,
      },
      {
        documentType: 'nic_back',
        label: 'nic-back',
        documentId: dto.nicBackDocumentId,
      },
      {
        documentType: 'address_proof',
        label: 'address-proof',
        documentId: dto.addressProofDocumentId,
      },
      {
        documentType: 'bank_document',
        label: 'bank-document',
        documentId: dto.bankDocumentId,
      },
    ];
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
  private async getRequiredKycDocument(documentId: string) {
    const document = await this.documentsService.getById(documentId);

    if (!document || document.category !== 'kyc') {
      throw new NotFoundException('KYC document not found');
    }

    if (document.status === 'deleted') {
      throw new NotFoundException('KYC document not found');
    }

    return document;
  }

  // Handles the mobile onboarding flow: uploads media, stores document metadata, and creates/updates the user profile.
  async submitMobileKyc(dto: SubmitKycDto) {
    try {
      this.mediaService.ensureCloudinaryConfigured();

      const userRef = dto.userId
        ? this.db.collection('users').doc(dto.userId)
        : this.db.collection('users').doc();
      const userId = userRef.id;

      const documentRefs: Record<string, string> = {};

      for (const field of this.buildUploadFields(dto)) {
<<<<<<< HEAD
        const docRecord = await this.documentsService.getById(field.documentId);
        
        if (!docRecord || docRecord.category !== 'kyc' || docRecord.status === 'deleted') {
          throw new BadRequestException(`Invalid or missing KYC document for ${field.documentType}.`);
        }

        // Optional: verify it belongs to the correct user if userId is provided
        if (dto.userId && docRecord.userId !== dto.userId) {
          throw new ForbiddenException(`Access denied for document ${field.documentId}.`);
        }

        documentRefs[field.documentType] = docRecord.id;
      }

      // Handle profile photo - if it's a data URL, upload it. If it's already a URL, use it.
      let profilePhotoUrl = dto.profilePhotoUrl;
      let profilePictureData: any = null;

      if (dto.profilePhotoUrl.startsWith('data:')) {
        const profileUpload = await this.mediaService.uploadProfilePictureFromDataUrl(
=======
        // Validate and hash before upload so duplicate sensitive files can be blocked.
        const prepared = this.mediaService.decodeDataUrl(field.dataUrl, field.label);
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

        // Upload the raw file first, then persist the reviewable metadata in Firestore.
        const uploaded = await this.mediaService.uploadSensitiveDocumentFromDataUrl(
>>>>>>> f77b41fe (add comments)
          userId,
          dto.profilePhotoUrl,
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
        {
          uid: userId,
          role: [dto.role],
          fullName: dto.fullName.trim(),
          email: dto.email.trim().toLowerCase(),
          emailLower: this.normalizeEmail(dto.email),
          phone: dto.phoneNumber.trim(),
          phoneNormalized: this.normalizePhone(dto.phoneNumber),
          nic: dto.nic.trim(),
          dateOfBirth: dto.birthDate.trim(),
          photoURL: profilePhotoUrl,
          profilePicture: profilePictureData,
          passwordHash: dto.passwordHash,
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
            bankAccountNumber: dto.bankAccountNumber,
            bankName: dto.bankName,
            branchCode: dto.branchCode,
            accountType: dto.accountType,
            documentRefs,
            submittedAt: admin.firestore.FieldValue.serverTimestamp(),
          },
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        },
        { merge: true },
      );

      return {
        success: true,
        userId,
        kycStatus: 'pending',
        documentIds: Object.values(documentRefs),
        message: 'KYC submitted successfully',
      };
    } catch (error) {
      if (error instanceof BadRequestException) {
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
      const document = await this.getRequiredKycDocument(documentId);
      await this.documentsService.updateReviewStatus(documentId, 'approved', {
        reviewedBy,
        notes,
      });
      await this.authService.updateUserKycStatus(document.userId, 'approved');
      await this.db.collection('users').doc(document.userId).set(
        {
          reviewedAt: admin.firestore.FieldValue.serverTimestamp(),
          rejectionReason: '',
          notes: notes || '',
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        },
        { merge: true },
      );

      return {
        success: true,
        message: 'KYC document approved successfully',
        documentId,
      };
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }

      console.error('Error approving KYC document:', error);
      rethrowFirebaseError(error, 'Failed to approve KYC document');
    }
  }

  // Rejects a document and stores the rejection reason on both the document and user profile.
  async rejectDocument(documentId: string, reason: string, reviewedBy?: string) {
    try {
      const document = await this.getRequiredKycDocument(documentId);
      await this.documentsService.updateReviewStatus(documentId, 'rejected', {
        reviewedBy,
        rejectionReason: reason,
      });
      await this.authService.updateUserKycStatus(document.userId, 'rejected');
      await this.db.collection('users').doc(document.userId).set(
        {
          reviewedAt: admin.firestore.FieldValue.serverTimestamp(),
          rejectionReason: reason,
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        },
        { merge: true },
      );

      return {
        success: true,
        message: 'KYC document rejected successfully',
        documentId,
      };
    } catch (error) {
      if (error instanceof NotFoundException) {
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
      const document = await this.getRequiredKycDocument(documentId);
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
