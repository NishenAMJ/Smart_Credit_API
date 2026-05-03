import { Injectable } from '@nestjs/common';
import * as admin from 'firebase-admin';

import { FirebaseService } from '../../firebase/firebase.service';
import { rethrowFirebaseError } from '../../common/firebase-error';
import type { UploadedMedia } from '../media/media.types';
import type {
  DocumentCategory,
  DocumentRecord,
  DocumentStatus,
} from './interfaces/document-record.interface';

type CreateDocumentRecordInput = {
  id?: string;
  userId: string;
  category: DocumentCategory;
  documentType: string;
  originalFilename: string;
  mimeType: string;
  fileHash: string;
  uploadStatus?: 'uploaded' | 'failed';
  status?: DocumentStatus;
  uploadedMedia: UploadedMedia;
};

@Injectable()
export class DocumentsService {
  constructor(private readonly firebaseService: FirebaseService) {}

  private get collection() {
    return this.firebaseService.db.collection('documents');
  }

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

  async createRecord(input: CreateDocumentRecordInput) {
    try {
      const docRef = input.id
        ? this.collection.doc(input.id)
        : this.collection.doc();

      const timestamp = admin.firestore.FieldValue.serverTimestamp();
      const record: DocumentRecord = {
        id: docRef.id,
        userId: input.userId,
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
        uploadedAt: timestamp,
        createdAt: timestamp,
        updatedAt: timestamp,
      };

      await docRef.set(record, { merge: true });
      return record;
    } catch (error) {
      rethrowFirebaseError(error, 'Failed to create document record');
    }
  }

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
}
