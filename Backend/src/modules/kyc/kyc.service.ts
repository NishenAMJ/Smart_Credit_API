import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { type CollectionReference, Timestamp } from 'firebase-admin/firestore';

import { FirebaseService } from '../../firebase/firebase.service';
import { AuthService } from '../auth/auth.service';
import type { KycStatus, UserDocument } from '../auth/auth.types';
import { SubmitKycDto, UpdateKycStatusDto, KycSubmissionDto } from './dto/kyc.dto';
import { SubmitKycDto as MobileSubmitKycDto } from './dto/submit-kyc.dto';

export interface KycDocument {
  id: string;
  userId: string;
  status: KycStatus;
  documentType: string;
  documentNumber: string;
  fullName: string;
  issuingCountry?: string;
  expiryDate?: string;
  documentFrontUrl?: string;
  documentBackUrl?: string;
  selfieUrl?: string;
  profilePictureUrl?: string;
  reviewNotes?: string;
  submittedAt: Timestamp;
  reviewedAt?: Timestamp;
  reviewedBy?: string;
}

@Injectable()
export class KycService {
  private readonly kycCollection: CollectionReference<KycDocument>;

  constructor(
    private readonly firebaseService: FirebaseService,
    private readonly authService: AuthService,
  ) {
    this.kycCollection = this.firebaseService.db.collection(
      'kyc_submissions',
    ) as CollectionReference<KycDocument>;
  }

  async submitKyc(userId: string, submitKycDto: SubmitKycDto): Promise<KycSubmissionDto> {
    // Check if user exists
    await this.authService.getUserById(userId);

    // Check if user already has a pending/under_review submission
    const existingSubmission = await this.getUserKycSubmission(userId);
    if (existingSubmission && ['pending', 'under_review'].includes(existingSubmission.status)) {
      throw new Error('You already have a KYC submission under review. Please wait for approval.');
    }

    const kycRef = this.kycCollection.doc();
    const now = Timestamp.now();

    const kycDoc: KycDocument = {
      id: kycRef.id,
      userId,
      status: 'pending',
      documentType: submitKycDto.documentType,
      documentNumber: submitKycDto.documentNumber,
      fullName: submitKycDto.fullName,
      issuingCountry: submitKycDto.issuingCountry,
      expiryDate: submitKycDto.expiryDate,
      documentFrontUrl: submitKycDto.documentFrontUrl,
      documentBackUrl: submitKycDto.documentBackUrl,
      selfieUrl: submitKycDto.selfieUrl,
      profilePictureUrl: submitKycDto.profilePictureUrl,
      submittedAt: now,
    };

    await kycRef.set(kycDoc);

    // Update user's KYC status
    await this.authService.updateUserKycStatus(userId, 'pending');

    return this.toDto(kycDoc);
  }

  async submitMobileKyc(
    submitKycDto: MobileSubmitKycDto,
  ): Promise<KycSubmissionDto> {
    if (!submitKycDto.userId?.trim()) {
      throw new BadRequestException('userId is required for mobile KYC submission.');
    }

    return this.submitKyc(submitKycDto.userId.trim(), {
      documentType: 'national_id',
      documentNumber: submitKycDto.nic,
      fullName: submitKycDto.fullName,
      issuingCountry: 'Sri Lanka',
      expiryDate: undefined,
      documentFrontUrl: submitKycDto.nicFrontUrl,
      documentBackUrl: submitKycDto.nicBackUrl,
      selfieUrl: undefined,
      profilePictureUrl: submitKycDto.profilePhotoUrl,
    });
  }

  async getUserKycSubmission(userId: string): Promise<KycSubmissionDto | null> {
    const snapshot = await this.kycCollection
      .where('userId', '==', userId)
      .get();

    if (snapshot.empty) {
      return null;
    }

    const latestDoc = snapshot.docs
      .map((doc) => doc.data() as KycDocument)
      .sort(
        (left, right) =>
          right.submittedAt.toMillis() - left.submittedAt.toMillis(),
      )[0];

    if (!latestDoc) {
      return null;
    }

    const doc = latestDoc;
    return this.toDto(doc);
  }

  async getAllKycSubmissions(): Promise<KycSubmissionDto[]> {
    const snapshot = await this.kycCollection
      .orderBy('submittedAt', 'desc')
      .get();

    return snapshot.docs.map(doc => this.toDto(doc.data() as KycDocument));
  }

  async getKycSubmissionsByStatus(status: KycStatus): Promise<KycSubmissionDto[]> {
    const snapshot = await this.kycCollection
      .where('status', '==', status)
      .get();

    return snapshot.docs
      .map((doc) => doc.data() as KycDocument)
      .sort(
        (left, right) =>
          right.submittedAt.toMillis() - left.submittedAt.toMillis(),
      )
      .map((doc) => this.toDto(doc));
  }

  async updateKycStatus(
    submissionId: string,
    updateDto: UpdateKycStatusDto,
    reviewedBy: string,
  ): Promise<KycSubmissionDto> {
    const submissionRef = this.kycCollection.doc(submissionId);
    const submissionDoc = await submissionRef.get();

    if (!submissionDoc.exists) {
      throw new NotFoundException('KYC submission not found');
    }

    const submission = submissionDoc.data() as KycDocument;
    const now = Timestamp.now();

    const updateData: Partial<KycDocument> = {
      status: updateDto.status,
      reviewNotes: updateDto.reviewNotes,
      reviewedAt: now,
      reviewedBy,
    };

    await submissionRef.update(updateData);

    // Update user's KYC status
    await this.authService.updateUserKycStatus(submission.userId, updateDto.status);

    const updatedDoc = await submissionRef.get();
    return this.toDto(updatedDoc.data() as KycDocument);
  }

  private toDto(doc: KycDocument): KycSubmissionDto {
    return {
      id: doc.id,
      userId: doc.userId,
      status: doc.status,
      documentType: doc.documentType,
      documentNumber: doc.documentNumber,
      fullName: doc.fullName,
      issuingCountry: doc.issuingCountry,
      expiryDate: doc.expiryDate,
      documentFrontUrl: doc.documentFrontUrl,
      documentBackUrl: doc.documentBackUrl,
      selfieUrl: doc.selfieUrl,
      profilePictureUrl: doc.profilePictureUrl,
      reviewNotes: doc.reviewNotes,
      submittedAt: doc.submittedAt.toDate(),
      reviewedAt: doc.reviewedAt?.toDate(),
      reviewedBy: doc.reviewedBy,
    };
  }
}
