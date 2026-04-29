import { Injectable, NotFoundException } from '@nestjs/common';
import * as admin from 'firebase-admin';
import { FirebaseService } from '../../firebase/firebase.service';
import { KycDocument } from './interfaces/kyc-document.interface';
import { rethrowFirebaseError } from '../../common/firebase-error';
import { SubmitKycDto } from './dto/submit-kyc.dto';

@Injectable()
export class KycService {
  constructor(private readonly firebaseService: FirebaseService) {}

  private get db() {
    return this.firebaseService.db;
  }

  private mapUserToKycDocument(
    doc:
      | FirebaseFirestore.QueryDocumentSnapshot
      | FirebaseFirestore.DocumentSnapshot,
  ): KycDocument {
    const data = doc.data() ?? {};

    return {
      id: doc.id,
      userId: doc.id,
      fullName: data.fullName,
      email: data.email,
      phone: data.phone,
      documentType: 'profile_kyc',
      documentUrl: data.photoURL,
      status: data.kycStatus ?? 'pending',
      submittedAt: data.createdAt ?? data.updatedAt,
      reviewedAt: data.updatedAt,
      notes: data.notes,
      rejectionReason: data.rejectionReason,
    };
  }

  async submitMobileKyc(dto: SubmitKycDto) {
    try {
      const docId = dto.userId || `${dto.role}_${Date.now()}`;
      const docRef = this.db.collection('users').doc(docId);

      await docRef.set(
        {
          uid: docId,
          role: [dto.role],
          fullName: dto.fullName.trim(),
          email: dto.email.trim().toLowerCase(),
          phone: dto.phoneNumber.trim(),
          nic: dto.nic.trim(),
          dateOfBirth: dto.birthDate.trim(),
          photoURL: dto.profilePhotoUrl,
          passwordHash: dto.passwordHash,
          creditScore: 0,
          rating: 0,
          totalLoansCompleted: 0,
          totalAmountLent: 0,
          totalAmountBorrowed: 0,
          kycStatus: 'pending',
          notes: '',
          rejectionReason: '',
          kycFiles: {
            nicFrontUrl: dto.nicFrontUrl,
            nicBackUrl: dto.nicBackUrl,
            addressProofNumber: dto.addressProofNumber,
            addressProofUrl: dto.addressProofUrl,
            bankAccountNumber: dto.bankAccountNumber,
            bankName: dto.bankName,
            branchCode: dto.branchCode,
            accountType: dto.accountType,
            bankDocumentUrl: dto.bankDocumentUrl,
            profilePhotoUrl: dto.profilePhotoUrl,
            submittedAt: admin.firestore.FieldValue.serverTimestamp(),
          },
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        },
        { merge: true },
      );

      return {
        success: true,
        userId: docId,
        kycStatus: 'pending',
        message: 'KYC submitted successfully',
      };
    } catch (error) {
      console.error('Error submitting mobile KYC:', error);
      rethrowFirebaseError(error, 'Failed to submit KYC');
    }
  }

  async getPendingKyc() {
    try {
      const kycSnapshot = await this.db
        .collection('users')
        .where('kycStatus', '==', 'pending')
        .get();

      const documents = kycSnapshot.docs.map((doc) =>
        this.mapUserToKycDocument(doc),
      );

      return {
        success: true,
        count: documents.length,
        documents,
      };
    } catch (error) {
      console.error('Error fetching pending KYC documents:', error);
      rethrowFirebaseError(error, 'Failed to fetch pending KYC documents');
    }
  }

  async getUserDocuments(userId: string) {
    try {
      const userSnapshot = await this.db.collection('users').doc(userId).get();

      if (!userSnapshot.exists) {
        return {
          success: true,
          count: 0,
          documents: [],
        };
      }

      const documents = [this.mapUserToKycDocument(userSnapshot)];

      return {
        success: true,
        count: documents.length,
        documents,
      };
    } catch (error) {
      console.error('Error fetching user KYC documents:', error);
      rethrowFirebaseError(error, 'Failed to fetch user KYC documents');
    }
  }

  async approveDocument(documentId: string, notes?: string) {
    try {
      const docRef = this.db.collection('users').doc(documentId);
      const docSnapshot = await docRef.get();

      if (!docSnapshot.exists) {
        throw new NotFoundException('KYC document not found');
      }

      await docRef.update({
        kycStatus: 'approved',
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
      rethrowFirebaseError(error, 'Failed to approve KYC document');
    }
  }

  async rejectDocument(documentId: string, reason: string) {
    try {
      const docRef = this.db.collection('users').doc(documentId);
      const docSnapshot = await docRef.get();

      if (!docSnapshot.exists) {
        throw new NotFoundException('KYC document not found');
      }

      await docRef.update({
        kycStatus: 'rejected',
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
      rethrowFirebaseError(error, 'Failed to reject KYC document');
    }
  }
}
