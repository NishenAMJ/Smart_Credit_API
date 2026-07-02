import { Injectable } from '@nestjs/common';
import * as admin from 'firebase-admin';

import { removeUndefinedDeep } from '../../common/remove-undefined.deep';
import { FirebaseService } from '../../firebase/firebase.service';
import { rethrowFirebaseError } from '../../common/firebase-error';
import type { UploadedMedia } from '../media/media.types';
import type {
  DocumentCategory,
  DocumentRecord,
  DocumentRelatedEntityType,
  DocumentSource,
  DocumentStatus,
} from './interfaces/document-record.interface';

type CreateDocumentRecordInput = {
  id?: string;
  userId: string;
  fullName?: string;
  email?: string;
  phone?: string;
  userKycStatus?: string;
  category: DocumentCategory;
  documentType: string;
  originalFilename: string;
  mimeType: string;
  fileHash: string;
  uploadStatus?: 'uploaded' | 'failed';
  status?: DocumentStatus;
  source?: DocumentSource;
  relatedEntityType?: DocumentRelatedEntityType;
  relatedEntityId?: string;
  displayName?: string;
  uploadedMedia: UploadedMedia;
};

@Injectable()
export class DocumentsService {
  constructor(private readonly firebaseService: FirebaseService) {}

  private get collection() {
    return this.firebaseService.db.collection('documents');
  }

  // Fetches one stored document metadata record by id.
  async getById(documentId: string) {
    try {
      const snapshot = await this.collection.doc(documentId).get();
      return snapshot.exists
        ? ({ id: snapshot.id, ...snapshot.data() } as DocumentRecord)
        : null;
    } catch (error) {
      rethrowFirebaseError(error, 'Failed to fetch document record');
    }
  }

  // Persists document metadata after the actual file has already been uploaded to Cloudinary.
  async createRecord(input: CreateDocumentRecordInput) {
    try {
      const docRef = input.id
        ? this.collection.doc(input.id)
        : this.collection.doc();

      const timestamp = admin.firestore.FieldValue.serverTimestamp();
      const record: DocumentRecord = {
        id: docRef.id,
        userId: input.userId,
        fullName: input.fullName,
        email: input.email,
        phone: input.phone,
        userKycStatus: input.userKycStatus,
        category: input.category,
        documentType: input.documentType,
        originalFilename: input.originalFilename,
        mimeType: input.mimeType,
        fileHash: input.fileHash,
        cloudinaryAssetId: input.uploadedMedia.assetId,
        cloudinaryPublicId: input.uploadedMedia.publicId,
        cloudinaryResourceType: input.uploadedMedia.resourceType,
        cloudinaryDeliveryType: input.uploadedMedia.deliveryType,
        cloudinarySecureUrl: input.uploadedMedia.secureUrl,
        cloudinaryVersion: input.uploadedMedia.version,
        format: input.uploadedMedia.format,
        fileSize: input.uploadedMedia.bytes,
        uploadStatus: input.uploadStatus ?? 'uploaded',
        status: input.status ?? 'pending_review',
        source: input.source ?? 'user_upload',
        relatedEntityType: input.relatedEntityType,
        relatedEntityId: input.relatedEntityId,
        displayName: input.displayName,
        reviewerId: undefined,
        reviewTimestamp: undefined,
        reviewNotes: undefined,
        uploadedAt: timestamp,
        createdAt: timestamp,
        updatedAt: timestamp,
      };

      await docRef.set(removeUndefinedDeep(record), { merge: true });
      return record;
    } catch (error) {
      rethrowFirebaseError(error, 'Failed to create document record');
    }
  }

  // Lists a user's documents and hides soft-deleted records from normal reads.
  async listByUser(userId: string, category?: DocumentCategory) {
    try {
      let query: FirebaseFirestore.Query = this.collection.where(
        'userId',
        '==',
        userId,
      );

      if (category) {
        query = query.where('category', '==', category);
      }

      const snapshot = await query.orderBy('createdAt', 'desc').get();
      return snapshot.docs
        .map((doc) => ({ id: doc.id, ...doc.data() }) as DocumentRecord)
        .filter((doc) => doc.status !== 'deleted');
    } catch (error) {
      rethrowFirebaseError(error, 'Failed to fetch user documents');
    }
  }

  // Prevents saving the same uploaded file twice by comparing stored SHA-256 hashes.
  async findDuplicate(
    userId: string,
    fileHash: string,
    category?: DocumentCategory,
  ) {
    try {
      let query: FirebaseFirestore.Query = this.collection
        .where('userId', '==', userId)
        .where('fileHash', '==', fileHash);

      if (category) {
        query = query.where('category', '==', category);
      }

      const snapshot = await query.limit(5).get();
      const duplicateDoc = snapshot.docs.find(
        (doc) => doc.data().status !== 'deleted',
      );

      return duplicateDoc
        ? ({ id: duplicateDoc.id, ...duplicateDoc.data() } as DocumentRecord)
        : null;
    } catch (error) {
      rethrowFirebaseError(error, 'Failed to check duplicate documents');
    }
  }

  // Returns paginated KYC documents that are still waiting for admin review.
  async getPendingReview(limit: number, cursor?: string) {
    try {
      let query: FirebaseFirestore.Query = this.collection
        .where('category', '==', 'kyc')
        .where('status', '==', 'pending_review')
        .orderBy('createdAt', 'desc');

      if (cursor) {
        const cursorDoc = await this.collection.doc(cursor).get();
        if (cursorDoc.exists) {
          query = query.startAfter(cursorDoc);
        }
      }

      const snapshot = await query.limit(limit + 1).get();
      const docs = snapshot.docs
        .slice(0, limit)
        .map((doc) => ({ id: doc.id, ...doc.data() }) as DocumentRecord);

      return {
        documents: docs,
        hasMore: snapshot.size > limit,
        nextCursor:
          snapshot.size > limit ? docs[docs.length - 1]?.id : undefined,
      };
    } catch (error) {
      rethrowFirebaseError(error, 'Failed to fetch pending documents');
    }
  }

  // Stores the outcome of an admin review on the document record itself.
  async updateReviewStatus(
    documentId: string,
    status: Extract<DocumentStatus, 'approved' | 'rejected'>,
    review: {
      reviewedBy?: string;
      notes?: string;
      rejectionReason?: string;
    },
  ) {
    try {
      await this.collection.doc(documentId).update({
        status,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        review: {
          reviewedAt: admin.firestore.FieldValue.serverTimestamp(),
          reviewedBy: review.reviewedBy ?? null,
          notes: review.notes ?? '',
          rejectionReason: review.rejectionReason ?? '',
        },
      });
    } catch (error) {
      rethrowFirebaseError(error, 'Failed to update document review status');
    }
  }

  // Soft delete keeps the history for audit purposes while hiding the file from regular lists.
  async softDelete(documentId: string, deletedBy?: string, reason?: string) {
    try {
      await this.collection.doc(documentId).update({
        status: 'deleted',
        deletedAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        deletion: {
          deletedAt: admin.firestore.FieldValue.serverTimestamp(),
          deletedBy: deletedBy ?? null,
          reason: reason ?? '',
        },
      });
    } catch (error) {
      rethrowFirebaseError(error, 'Failed to soft delete document record');
    }
  }

  /**
   * Convenience wrapper for backend-generated documents (e.g. signed loan-agreement PDFs).
   * Creates/overwrites the document record with `source: 'system_generated'` and `status: 'approved'`
   * so it is immediately accessible without a review step.
   */
  async createSystemGeneratedRecord(input: {
    id?: string;
    userId: string;
    category: DocumentCategory;
    documentType: string;
    originalFilename: string;
    mimeType: string;
    fileHash: string;
    relatedEntityType: DocumentRelatedEntityType;
    relatedEntityId: string;
    displayName?: string;
    uploadedMedia: UploadedMedia;
  }) {
    return this.createRecord({
      ...input,
      source: 'system_generated',
      status: 'approved',
      uploadStatus: 'uploaded',
    });
  }

  /**
   * Replaces the Cloudinary asset reference on an existing document record.
   * Used when the backend re-generates and re-uploads a file (e.g. new signed PDF version).
   */
  async updateCloudinaryAsset(
    documentId: string,
    uploadedMedia: UploadedMedia,
    fileHash: string,
  ) {
    try {
      await this.collection.doc(documentId).update({
        cloudinaryAssetId: uploadedMedia.assetId,
        cloudinaryPublicId: uploadedMedia.publicId,
        cloudinaryResourceType: uploadedMedia.resourceType,
        cloudinaryDeliveryType: uploadedMedia.deliveryType,
        cloudinarySecureUrl: uploadedMedia.secureUrl,
        cloudinaryVersion: uploadedMedia.version,
        format: uploadedMedia.format ?? null,
        fileSize: uploadedMedia.bytes,
        fileHash,
        uploadStatus: 'uploaded',
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });
    } catch (error) {
      rethrowFirebaseError(error, 'Failed to update Cloudinary asset on document record');
    }
  }

  /**
   * Finds the most recent non-deleted document record linked to a related entity (e.g. a loan or legal document).
   */
  async getByRelatedEntity(
    relatedEntityType: DocumentRelatedEntityType,
    relatedEntityId: string,
    category?: DocumentCategory,
  ) {
    try {
      let query: FirebaseFirestore.Query = this.collection
        .where('relatedEntityType', '==', relatedEntityType)
        .where('relatedEntityId', '==', relatedEntityId);

      if (category) {
        query = query.where('category', '==', category);
      }

      const snapshot = await query.orderBy('createdAt', 'desc').limit(10).get();
      const docs = snapshot.docs
        .map((doc) => ({ id: doc.id, ...doc.data() }) as DocumentRecord)
        .filter((doc) => doc.status !== 'deleted');

      return docs[0] ?? null;
    } catch (error) {
      rethrowFirebaseError(error, 'Failed to fetch document record by related entity');
    }
  }
}
