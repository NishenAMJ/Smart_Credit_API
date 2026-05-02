import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import * as admin from 'firebase-admin';
import { FirebaseService } from '../../firebase/firebase.service';
import { KycDocument } from './interfaces/kyc-document.interface';
import { rethrowFirebaseError } from '../../common/firebase-error';
import { SubmitKycDto } from './dto/submit-kyc.dto';

@Injectable()
export class KycService {
  private static readonly DEFAULT_PAGE_SIZE = 20;
  private static readonly MAX_PAGE_SIZE = 50;

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
      const docId = dto.userId || `${dto.role}_${Date.now()}`;

      // Process any base64 URLs to Firebase Storage
      const processedUrls = await this.processKycUrls(docId, {
        nicFrontUrl: dto.nicFrontUrl,
        nicBackUrl: dto.nicBackUrl,
        addressProofUrl: dto.addressProofUrl,
        bankDocumentUrl: dto.bankDocumentUrl,
        profilePhotoUrl: dto.profilePhotoUrl,
      });

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
          photoURL: processedUrls.profilePhotoUrl || dto.profilePhotoUrl,
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
            nicFrontUrl: processedUrls.nicFrontUrl || dto.nicFrontUrl,
            nicBackUrl: processedUrls.nicBackUrl || dto.nicBackUrl,
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
        userId: docId,
        kycStatus: 'pending',
        message: 'KYC submitted successfully',
      };
    } catch (error) {
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
