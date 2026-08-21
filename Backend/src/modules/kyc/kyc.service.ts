import {
  BadRequestException,
  ConflictException,
  HttpException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  Optional,
} from '@nestjs/common';
import { FieldValue } from 'firebase-admin/firestore';

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
import { ChatGateway } from '../chat/gateway/chat.gateway';
import { buildSearchTokens } from '../../common/firestore/search-tokens';
import { writeAuditLog } from '../../common/audit/write-audit-log';
import { ResubmitKycDto } from './dto/resubmit-kyc.dto';
import { hasRole } from '../../firebase/firestore-query.utils';

type KycUploadField = {
  documentType:
    | 'nic_front'
    | 'nic_back'
    | 'selfie'
    | 'address_proof'
    | 'bank_document';
  label: string;
  dataUrl: string;
};

type KycPayloadFieldKey =
  | 'nic'
  | 'documentNumber'
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
    @Optional() private readonly gateway?: ChatGateway,
  ) {}

  private get db() {
    return this.firebaseService.db;
  }

  // Converts the generic document record shape into the smaller KYC response format.
  private mapDocumentToKycDocument(
    document: DocumentRecord,
    currentUserKycStatus?: string,
  ): KycDocument {
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
      userKycStatus: currentUserKycStatus ?? document.userKycStatus,
      documentType: document.documentType,
      originalFilename: document.originalFilename,
      mimeType: document.mimeType,
      fileHash: document.fileHash,
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
      this.firstDefined(dto, ['selfieUrl'])
        ? {
            documentType: 'selfie',
            label: 'selfie',
            dataUrl: this.firstDefined(dto, ['selfieUrl']) as string,
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

    throw new ForbiddenException(
      'You do not have access to this KYC document.',
    );
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
        resourceType: prepared.resourceType === 'image' ? 'image' : 'raw',
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

  async resubmitRejectedKyc(
    userId: string,
    role: UserRole,
    dto: ResubmitKycDto,
  ) {
    const userRef = this.db.collection('users').doc(userId);
    const userSnapshot = await userRef.get();
    if (!userSnapshot.exists) {
      throw new NotFoundException('User account not found.');
    }

    const user = userSnapshot.data() as ExistingKycUser;
    if (user.kycStatus !== 'rejected') {
      throw new ConflictException(
        'KYC can only be resubmitted after it has been rejected.',
      );
    }

    const uploadFields = this.buildUploadFields({
      role: role === 'lender' ? 'lender' : 'borrower',
      fullName: user.fullName ?? '',
      email: user.email ?? '',
      phoneNumber: user.phone ?? '',
      nic: user.nic ?? '',
      birthDate: user.dateOfBirth ?? '',
      ...dto,
    });
    const createdDocuments: DocumentRecord[] = [];

    try {
      this.mediaService.ensureCloudinaryConfigured();
      for (const field of uploadFields) {
        createdDocuments.push(
          await this.uploadKycDocument(userId, field, user),
        );
      }

      const now = FieldValue.serverTimestamp();
      const documentRefs = Object.fromEntries(
        createdDocuments.map((document) => [
          document.documentType,
          document.id,
        ]),
      );
      await userRef.set(
        {
          kycStatus: 'pending',
          rejectionReason: '',
          notes: '',
          updatedAt: now,
          kycFiles: {
            documentRefs,
            submittedAt: now,
          },
        },
        { merge: true },
      );
      await this.db
        .collection('borrowers')
        .doc(userId)
        .set({ kycVerified: false, updatedAt: now }, { merge: true });
      this.emitAdminChange(userId, 'resubmitted');

      return {
        success: true,
        userId,
        kycStatus: 'pending',
        documentIds: createdDocuments.map((document) => document.id),
        message: 'KYC documents resubmitted successfully.',
      };
    } catch (error) {
      for (const document of createdDocuments) {
        await this.documentsService
          .softDelete(document.id, userId, 'KYC resubmission rolled back')
          .catch(() => undefined);
      }
      throw error;
    }
  }

  // Handles the mobile onboarding flow: uploads media, stores document metadata, and creates/updates the user profile.
  async submitMobileKyc(
    dto: SubmitKycDto,
    authenticatedUserId?: string,
    authenticatedRole?: UserRole,
  ) {
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
      const requestedRole =
        authenticatedRole === 'borrower' || authenticatedRole === 'lender'
          ? authenticatedRole
          : dto.role === 'borrower' || dto.role === 'lender'
            ? dto.role
            : undefined;

      if (!existingUser && !requestedRole) {
        throw new BadRequestException(
          'A borrower or lender role is required to create a KYC profile.',
        );
      }
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
      const nic =
        this.firstDefined(dto, ['nic', 'documentNumber']) ?? existingUser?.nic;
      const birthDate = this.resolveOptionalField(
        dto,
        'birthDate',
        existingUser?.dateOfBirth,
      );

      const documentRefs: Record<string, string> = {};
      const documentIds: string[] = [];

      for (const field of this.buildUploadFields(dto)) {
        const record = await this.uploadKycDocument(
          userId,
          field,
          existingUser,
        );
        documentRefs[field.documentType] = record.id;
        documentIds.push(record.id);
        createdDocuments.push(record);
      }

      const profilePhotoSource = this.firstDefined(dto, [
        'profilePhotoUrl',
        'profilePictureUrl',
      ]);
      let profilePhotoUrl = profilePhotoSource ?? '';
      let profilePictureData: any = null;

      if (profilePhotoSource?.startsWith('data:')) {
        const profileUpload =
          await this.mediaService.uploadProfilePictureFromDataUrl(
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
          updatedAt: FieldValue.serverTimestamp(),
        };
      }

      await userRef.set(
        removeUndefinedDeep({
          uid: userId,
          // Authentication owns roles. KYC only initializes these fields for a
          // genuinely new legacy profile and never overwrites an existing account.
          ...(!existingUser && requestedRole
            ? {
                role: [requestedRole],
                roles: [requestedRole],
                primaryRole: requestedRole,
              }
            : {}),
          ...(fullName ? { fullName } : {}),
          ...(email
            ? {
                email: email.toLowerCase(),
                emailLower: this.normalizeEmail(email),
              }
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
          creditScore: 0,
          rating: 0,
          totalLoansCompleted: 0,
          totalAmountLent: 0,
          totalAmountBorrowed: 0,
          kycStatus: 'pending',
          accountStatus: 'active',
          searchTokens: buildSearchTokens([
            userId,
            fullName,
            email,
            phoneNumber,
            requestedRole,
          ]),
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
            submittedAt: FieldValue.serverTimestamp(),
          },
          createdAt: FieldValue.serverTimestamp(),
          updatedAt: FieldValue.serverTimestamp(),
        }),
        { merge: true },
      );
      this.emitAdminChange(userId, 'submitted');

      const currentSubmission = await this.getMySubmission(userId);

      return {
        success: true,
        userId,
        kycStatus: 'pending',
        documentIds,
        message: 'KYC submitted successfully',
        submission: currentSubmission.submission,
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
      const result = await this.documentsService.getKycReview(pageSize, cursor);
      const userIds = [...new Set(result.documents.map((doc) => doc.userId))];
      const userSnapshots = await Promise.all(
        userIds.map((userId) => this.db.collection('users').doc(userId).get()),
      );
      const currentStatuses = new Map(
        userSnapshots.map((snapshot, index) => {
          const status = snapshot.data()?.kycStatus;
          return [
            snapshot.id || userIds[index],
            typeof status === 'string' ? status : 'not_submitted',
          ];
        }),
      );
      const users = this.db.collection('users');
      const [pendingCount, approvedCount, rejectedCount] = await Promise.all(
        ['pending', 'approved', 'rejected'].map(async (status) => {
          const snapshot = await users
            .where('kycStatus', '==', status)
            .count()
            .get();
          return snapshot.data().count;
        }),
      );

      return {
        success: true,
        count: result.documents.length,
        summary: {
          total: pendingCount + approvedCount + rejectedCount,
          pending: pendingCount,
          approved: approvedCount,
          rejected: rejectedCount,
        },
        documents: result.documents.map((doc) =>
          this.mapDocumentToKycDocument(doc, currentStatuses.get(doc.userId)),
        ),
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

  // Builds the mobile KYC view from the canonical user status and latest active files.
  async getMySubmission(userId: string) {
    try {
      const [userSnapshot, documents] = await Promise.all([
        this.db.collection('users').doc(userId).get(),
        this.documentsService.listByUser(userId, 'kyc'),
      ]);

      if (!userSnapshot.exists) {
        throw new NotFoundException('User not found');
      }

      const user = userSnapshot.data() as ExistingKycUser & {
        kycStatus?: string;
        kycFiles?: { submittedAt?: unknown };
        rejectionReason?: string;
        notes?: string;
        updatedAt?: unknown;
      };
      const status = this.normalizeUserKycStatus(user.kycStatus);

      if (status === 'not_submitted' && documents.length === 0) {
        return { submission: null };
      }

      const latestDocument = documents[0];
      const latestReview = documents.find(
        (document) => document.reviewTimestamp || document.review?.reviewedAt,
      );

      return {
        submission: {
          id: latestDocument?.id ?? userId,
          userId,
          status,
          documentType: 'national_identity_card',
          documentNumber: user.nic ?? '',
          fullName: user.fullName ?? '',
          reviewNotes:
            user.rejectionReason ||
            user.notes ||
            latestReview?.review?.rejectionReason ||
            latestReview?.reviewNotes ||
            latestReview?.review?.notes ||
            '',
          submittedAt: this.toIsoString(
            user.kycFiles?.submittedAt ??
              latestDocument?.uploadedAt ??
              user.updatedAt,
          ),
          reviewedAt: this.toOptionalIsoString(
            latestReview?.reviewTimestamp ?? latestReview?.review?.reviewedAt,
          ),
          reviewedBy:
            latestReview?.reviewerId ?? latestReview?.review?.reviewedBy,
        },
      };
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }

      console.error('Error fetching current KYC submission:', error);
      rethrowFirebaseError(error, 'Failed to fetch current KYC submission');
    }
  }

  private normalizeUserKycStatus(
    value?: string,
  ): 'not_submitted' | 'pending' | 'approved' | 'rejected' {
    if (value === 'approved' || value === 'rejected' || value === 'pending') {
      return value;
    }

    return 'not_submitted';
  }

  private toOptionalIsoString(value: unknown): string | undefined {
    return value ? this.toIsoString(value) : undefined;
  }

  private toIsoString(value: unknown): string {
    if (value && typeof (value as { toDate?: unknown }).toDate === 'function') {
      return (value as { toDate: () => Date }).toDate().toISOString();
    }

    if (value instanceof Date) {
      return value.toISOString();
    }

    if (typeof value === 'string') {
      const parsed = new Date(value);
      if (!Number.isNaN(parsed.getTime())) {
        return parsed.toISOString();
      }
    }

    return new Date(0).toISOString();
  }

  // Approves a document and mirrors that result back onto the user's profile.
  async approveDocument(
    documentId: string,
    reviewedBy?: string,
    notes?: string,
  ) {
    try {
      const documentRef = this.db.collection('documents').doc(documentId);
      const reviewTimestamp = FieldValue.serverTimestamp();
      const selectedDocument = await this.documentsService.getById(documentId);
      if (!selectedDocument || selectedDocument.category !== 'kyc') {
        throw new NotFoundException('KYC document not found');
      }
      const submissionDocuments = (
        await this.documentsService.listByUser(selectedDocument.userId, 'kyc')
      ).filter((document) => document.status !== 'deleted');
      const documentTypes = new Set(
        submissionDocuments.map((document) => document.documentType),
      );
      if (!documentTypes.has('nic_front') || !documentTypes.has('nic_back')) {
        throw new BadRequestException(
          'The identity front and back documents must both be uploaded before KYC can be approved.',
        );
      }
      const pendingDocuments = submissionDocuments.filter(
        (document) => document.status === 'pending_review',
      );
      const result = await this.db.runTransaction(async (transaction) => {
        const userRef = this.db
          .collection('users')
          .doc(selectedDocument.userId);
        const [snapshot, userSnapshot] = await Promise.all([
          transaction.get(documentRef),
          transaction.get(userRef),
        ]);
        if (!snapshot.exists) {
          throw new NotFoundException('KYC document not found');
        }
        if (!userSnapshot.exists) {
          throw new NotFoundException('User not found');
        }

        const document = {
          ...(snapshot.data() as Omit<DocumentRecord, 'id'>),
          id: snapshot.id,
        } as DocumentRecord;

        if (document.category !== 'kyc' || document.status === 'deleted') {
          throw new NotFoundException('KYC document not found');
        }

        if (document.status !== 'pending_review') {
          throw new ConflictException(
            'This KYC document has already been reviewed.',
          );
        }

        const reviewNotes = notes?.trim() ?? '';
        const user = userSnapshot.data() ?? {};
        const isLender = hasRole(user.roles ?? user.role, 'lender');
        const isBorrower =
          hasRole(user.roles ?? user.role, 'borrower') || !isLender;
        const borrowerRef = this.db
          .collection('borrowers')
          .doc(document.userId);
        const borrowerNotificationRef = this.db
          .collection('borrowerNotifications')
          .doc(`kyc-approved-${document.userId}`);
        const lenderNotificationRef = this.db
          .collection('notifications')
          .doc(`kyc-approved-${document.userId}`);

        for (const pendingDocument of pendingDocuments) {
          transaction.update(
            this.db.collection('documents').doc(pendingDocument.id),
            {
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
            },
          );
        }

        transaction.update(userRef, {
          kycStatus: 'approved',
          reviewedAt: reviewTimestamp,
          reviewedBy: reviewedBy ?? null,
          rejectionReason: '',
          notes: reviewNotes,
          updatedAt: reviewTimestamp,
        });
        if (isBorrower) {
          transaction.set(
            borrowerRef,
            { kycVerified: true, updatedAt: reviewTimestamp },
            { merge: true },
          );
          transaction.set(
            borrowerNotificationRef,
            {
              borrowerId: document.userId,
              category: 'profile',
              severity: 'success',
              title: 'KYC approved',
              message: 'Your identity verification was approved.',
              isRead: false,
              readAt: null,
              relatedEntityType: 'profile',
              relatedEntityId: document.userId,
              actionTarget: 'profile',
              createdAt: reviewTimestamp,
              updatedAt: reviewTimestamp,
              metadata: { kycStatus: 'approved' },
            },
            { merge: true },
          );
          transaction.delete(
            this.db
              .collection('borrowerNotifications')
              .doc(`profile-kyc-${document.userId}`),
          );
          transaction.delete(
            this.db
              .collection('borrowerNotifications')
              .doc(`kyc-rejected-${document.userId}`),
          );
        }
        if (isLender) {
          transaction.set(
            lenderNotificationRef,
            {
              notificationId: `kyc-approved-${document.userId}`,
              userId: document.userId,
              category: 'system',
              eventType: 'kyc_approved',
              title: 'KYC approved',
              body: 'Your identity verification was approved.',
              severity: 'success',
              isRead: false,
              readAt: null,
              entityType: 'system',
              entityId: document.userId,
              actionLabel: 'Open settings',
              actionTarget: 'settings',
              createdAt: reviewTimestamp,
              metadata: { status: 'approved' },
            },
            { merge: true },
          );
          transaction.delete(
            this.db
              .collection('notifications')
              .doc(`kyc-rejected-${document.userId}`),
          );
        }
        return {
          userId: document.userId,
          documentIds: pendingDocuments.map((item) => item.id),
        };
      });
      await writeAuditLog(this.db, {
        actorUserId: reviewedBy ?? 'system',
        action: 'kyc.approved',
        entityType: 'user',
        entityId: result.userId,
        after: { status: 'approved' },
        metadata: { documentId, description: notes?.trim() ?? '' },
      });
      this.emitAdminChange(documentId, 'approved');

      return {
        success: true,
        message: 'KYC document approved successfully',
        documentId,
        documentIds: result.documentIds,
        userId: result.userId,
        status: 'approved',
        userKycStatus: 'approved',
      };
    } catch (error) {
      if (
        error instanceof NotFoundException ||
        error instanceof BadRequestException ||
        error instanceof ConflictException
      ) {
        throw error;
      }

      console.error('Error approving KYC document:', error);
      rethrowFirebaseError(error, 'Failed to approve KYC document');
    }
  }

  // Rejects a document and stores the rejection reason on both the document and user profile.
  async rejectDocument(
    documentId: string,
    reason: string,
    reviewedBy?: string,
  ) {
    try {
      const documentRef = this.db.collection('documents').doc(documentId);
      const reviewTimestamp = FieldValue.serverTimestamp();
      const rejectionReason = reason.trim();
      const selectedDocument = await this.documentsService.getById(documentId);
      if (!selectedDocument || selectedDocument.category !== 'kyc') {
        throw new NotFoundException('KYC document not found');
      }
      const pendingDocuments = (
        await this.documentsService.listByUser(selectedDocument.userId, 'kyc')
      ).filter((document) => document.status === 'pending_review');
      const result = await this.db.runTransaction(async (transaction) => {
        const userRef = this.db
          .collection('users')
          .doc(selectedDocument.userId);
        const [snapshot, userSnapshot] = await Promise.all([
          transaction.get(documentRef),
          transaction.get(userRef),
        ]);
        if (!snapshot.exists) {
          throw new NotFoundException('KYC document not found');
        }
        if (!userSnapshot.exists) {
          throw new NotFoundException('User not found');
        }

        const document = {
          ...(snapshot.data() as Omit<DocumentRecord, 'id'>),
          id: snapshot.id,
        } as DocumentRecord;

        if (document.category !== 'kyc' || document.status === 'deleted') {
          throw new NotFoundException('KYC document not found');
        }

        if (document.status !== 'pending_review') {
          throw new ConflictException(
            'This KYC document has already been reviewed.',
          );
        }

        const user = userSnapshot.data() ?? {};
        const isLender = hasRole(user.roles ?? user.role, 'lender');
        const isBorrower =
          hasRole(user.roles ?? user.role, 'borrower') || !isLender;
        const borrowerRef = this.db
          .collection('borrowers')
          .doc(document.userId);
        const borrowerNotificationRef = this.db
          .collection('borrowerNotifications')
          .doc(`kyc-rejected-${document.userId}`);
        const lenderNotificationRef = this.db
          .collection('notifications')
          .doc(`kyc-rejected-${document.userId}`);

        for (const pendingDocument of pendingDocuments) {
          transaction.update(
            this.db.collection('documents').doc(pendingDocument.id),
            {
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
            },
          );
        }

        transaction.update(userRef, {
          kycStatus: 'rejected',
          reviewedAt: reviewTimestamp,
          reviewedBy: reviewedBy ?? null,
          rejectionReason,
          notes: rejectionReason,
          updatedAt: reviewTimestamp,
        });
        if (isBorrower) {
          transaction.set(
            borrowerRef,
            { kycVerified: false, updatedAt: reviewTimestamp },
            { merge: true },
          );
          transaction.set(
            borrowerNotificationRef,
            {
              borrowerId: document.userId,
              category: 'profile',
              severity: 'warning',
              title: 'KYC needs new documents',
              message: rejectionReason,
              isRead: false,
              readAt: null,
              relatedEntityType: 'profile',
              relatedEntityId: document.userId,
              actionTarget: 'kyc-resubmit',
              createdAt: reviewTimestamp,
              updatedAt: reviewTimestamp,
              metadata: {
                kycStatus: 'rejected',
                rejectionReason,
              },
            },
            { merge: true },
          );
          transaction.delete(
            this.db
              .collection('borrowerNotifications')
              .doc(`profile-kyc-${document.userId}`),
          );
        }
        if (isLender) {
          transaction.set(
            lenderNotificationRef,
            {
              notificationId: `kyc-rejected-${document.userId}`,
              userId: document.userId,
              category: 'system',
              eventType: 'kyc_rejected',
              title: 'KYC needs new documents',
              body: rejectionReason,
              severity: 'warning',
              isRead: false,
              readAt: null,
              entityType: 'system',
              entityId: document.userId,
              actionLabel: 'Open settings',
              actionTarget: 'settings',
              createdAt: reviewTimestamp,
              metadata: { status: 'rejected', rejectionReason },
            },
            { merge: true },
          );
        }
        return {
          userId: document.userId,
          documentIds: pendingDocuments.map((item) => item.id),
        };
      });
      await writeAuditLog(this.db, {
        actorUserId: reviewedBy ?? 'system',
        action: 'kyc.rejected',
        entityType: 'user',
        entityId: result.userId,
        after: { status: 'rejected' },
        metadata: { documentId, reason: rejectionReason },
      });
      this.emitAdminChange(documentId, 'rejected');

      return {
        success: true,
        message: 'KYC document rejected successfully',
        documentId,
        documentIds: result.documentIds,
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

  private emitAdminChange(entityId: string, changeType: string): void {
    this.gateway?.emitToRole('admin', 'admin:changed', {
      resource: 'kyc',
      entityId,
      changeType,
      updatedAt: new Date().toISOString(),
    });
  }

  // Generates a signed delivery URL so documents stay private while still being viewable when authorized.
  async getSignedDocumentAccessUrl(
    documentId: string,
    requesterId: string,
    requesterRole: UserRole,
  ) {
    try {
      const document = await this.getRequiredKycDocument(
        documentId,
        requesterRole,
      );
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
