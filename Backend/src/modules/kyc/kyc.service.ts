import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
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
  dataUrl: string;
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

  private parseLimit(limit?: string) {
    const parsed = Number(limit ?? KycService.DEFAULT_PAGE_SIZE);
    if (!Number.isFinite(parsed)) {
      return KycService.DEFAULT_PAGE_SIZE;
    }

    return Math.min(Math.max(Math.trunc(parsed), 1), KycService.MAX_PAGE_SIZE);
  }

  private async uploadBase64ToStorage(userId: string, fieldName: string, dataUrl: string): Promise<string> {
    if (!dataUrl.startsWith('data:')) {
      return dataUrl;
    }

    const matches = dataUrl.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
    if (!matches || matches.length !== 3) {
      return dataUrl;
    }

    const mimeType = matches[1];
    const base64Data = matches[2];
    const buffer = Buffer.from(base64Data, 'base64');
    
    let extension = 'bin';
    if (mimeType.includes('jpeg') || mimeType.includes('jpg')) extension = 'jpg';
    else if (mimeType.includes('png')) extension = 'png';
    else if (mimeType.includes('pdf')) extension = 'pdf';

    const timestamp = Date.now();
    const filePath = `kyc-documents/${userId}/${fieldName}_${timestamp}.${extension}`;
    const file = this.firebaseService.bucket.file(filePath);

    await file.save(buffer, {
      metadata: { contentType: mimeType },
    });
    
    const bucketName = this.firebaseService.bucket.name;
    const encodedPath = encodeURIComponent(filePath);
    return `https://firebasestorage.googleapis.com/v0/b/${bucketName}/o/${encodedPath}?alt=media`;
  }

  private async processKycUrls(
    userId: string, 
    fields: Record<string, string | undefined>
  ): Promise<Record<string, string | undefined>> {
    const result: Record<string, string | undefined> = {};
    for (const [key, value] of Object.entries(fields)) {
      if (value && value.startsWith('data:')) {
        result[key] = await this.uploadBase64ToStorage(userId, key, value);
      } else {
        result[key] = value;
      }
    }
    return result;
  }

  async submitMobileKyc(dto: SubmitKycDto) {
    try {
      this.mediaService.ensureCloudinaryConfigured();

      const userRef = dto.userId
        ? this.db.collection('users').doc(dto.userId)
        : this.db.collection('users').doc();
      const userId = userRef.id;
      const profileUpload = await this.mediaService.uploadProfilePictureFromDataUrl(
        userId,
        dto.profilePhotoUrl,
      );

      const documentRefs: Record<string, string> = {};

      for (const field of this.buildUploadFields(dto)) {
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

        const uploaded = await this.mediaService.uploadSensitiveDocumentFromDataUrl(
          userId,
          'kyc',
          this.db.collection('documents').doc().id,
          field.dataUrl,
          field.label,
        );

        const record = await this.documentsService.createRecord({
          userId,
          category: 'kyc',
          documentType: field.documentType,
          originalFilename: uploaded.originalFilename,
          mimeType: uploaded.mimeType,
          fileHash: uploaded.fileHash,
          uploadedMedia: uploaded.uploaded,
          status: 'pending_review',
        });

        documentRefs[field.documentType] = record.id;
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
          photoURL: profileUpload.secureUrl,
          profilePicture: {
            cloudinaryPublicId: profileUpload.publicId,
            secureUrl: profileUpload.secureUrl,
            version: profileUpload.version,
            format: profileUpload.format ?? null,
            fileSize: profileUpload.bytes,
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
          },
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
            addressProofUrl: processedUrls.addressProofUrl || dto.addressProofUrl,
            bankAccountNumber: dto.bankAccountNumber,
            bankName: dto.bankName,
            branchCode: dto.branchCode,
            accountType: dto.accountType,
            bankDocumentUrl: processedUrls.bankDocumentUrl || dto.bankDocumentUrl,
            profilePhotoUrl: processedUrls.profilePhotoUrl || dto.profilePhotoUrl,
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

  async getPendingKyc(limit?: string, cursor?: string) {
    try {
      const pageSize = this.parseLimit(limit);
      let query: FirebaseFirestore.Query = this.db
        .collection('users')
        .where('kycStatus', '==', 'pending')
        .orderBy('createdAt', 'desc');

      if (cursor) {
        const cursorDoc = await this.db.collection('users').doc(cursor).get();
        if (cursorDoc.exists) {
          query = query.startAfter(cursorDoc);
        }
      }

      const kycSnapshot = await query.limit(pageSize + 1).get();
      const pageDocs = kycSnapshot.docs.slice(0, pageSize);

      const documents = pageDocs.map((doc) =>
        this.mapUserToKycDocument(doc),
      );

      return {
        success: true,
        count: documents.length,
        documents,
        hasMore: kycSnapshot.size > pageSize,
        nextCursor:
          kycSnapshot.size > pageSize ? pageDocs[pageDocs.length - 1]?.id : undefined,
      };
    } catch (error) {
      console.error('Error fetching pending KYC documents:', error);
      rethrowFirebaseError(error, 'Failed to fetch pending KYC documents');
    }
  }

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
