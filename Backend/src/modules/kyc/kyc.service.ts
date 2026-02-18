import {
  Injectable,
  NotFoundException,
  InternalServerErrorException,
} from '@nestjs/common';
import * as admin from 'firebase-admin';
import { KycDocument } from './interfaces/kyc-document.interface';

@Injectable()
export class KycService {
  private db = admin.firestore();

  async getPendingKyc() {
    try {
      const kycSnapshot = await this.db
        .collection('kyc_documents')
        .where('status', '==', 'pending')
        .get();

      const documents = kycSnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as KycDocument[];

      return {
        success: true,
        count: documents.length,
        documents,
      };
    } catch (error) {
      console.error('Error fetching pending KYC documents:', error);
      throw new InternalServerErrorException(
        'Failed to fetch pending KYC documents',
      );
    }
  }

  async getUserDocuments(userId: string) {
    try {
      const kycSnapshot = await this.db
        .collection('kyc_documents')
        .where('userId', '==', userId)
        .get();

      if (kycSnapshot.empty) {
        return {
          success: true,
          count: 0,
          documents: [],
        };
      }

      const documents = kycSnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as KycDocument[];

      return {
        success: true,
        count: documents.length,
        documents,
      };
    } catch (error) {
      console.error('Error fetching user KYC documents:', error);
      throw new InternalServerErrorException(
        'Failed to fetch user KYC documents',
      );
    }
  }

  async approveDocument(documentId: string, notes?: string) {
    try {
      const docRef = this.db.collection('kyc_documents').doc(documentId);
      const docSnapshot = await docRef.get();

      if (!docSnapshot.exists) {
        throw new NotFoundException('KYC document not found');
      }

      await docRef.update({
        status: 'approved',
        reviewedAt: admin.firestore.FieldValue.serverTimestamp(),
        notes: notes || '',
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      return {
        success: true,
        message: 'KYC document approved successfully',
        documentId,
      };
    } catch (error) {
      if (error instanceof NotFoundException) throw error;
      console.error('Error approving KYC document:', error);
      throw new InternalServerErrorException('Failed to approve KYC document');
    }
  }

  async rejectDocument(documentId: string, reason: string) {
    try {
      const docRef = this.db.collection('kyc_documents').doc(documentId);
      const docSnapshot = await docRef.get();

      if (!docSnapshot.exists) {
        throw new NotFoundException('KYC document not found');
      }

      await docRef.update({
        status: 'rejected',
        rejectionReason: reason,
        reviewedAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      return {
        success: true,
        message: 'KYC document rejected successfully',
        documentId,
      };
    } catch (error) {
      if (error instanceof NotFoundException) throw error;
      console.error('Error rejecting KYC document:', error);
      throw new InternalServerErrorException('Failed to reject KYC document');
    }
  }
}
