import type { DocumentCategory } from '../interfaces/document-record.interface';

// ─── Upload Init ─────────────────────────────────────────────────────────────

export class InitUploadDto {
  /** One of: 'kyc' | 'agreement' */
  category!: DocumentCategory;
  /** Fine-grained type, e.g. 'nic_front', 'bank_document', 'loan_agreement_pdf'. */
  documentType!: string;
  /** Original filename provided by the client (used to derive the Cloudinary publicId). */
  fileName!: string;
  /** MIME type the client intends to upload, e.g. 'image/jpeg' or 'application/pdf'. */
  contentType!: string;
  /** Optional: Firestore ID of the related entity (e.g. a loan or legal document). */
  relatedEntityId?: string;
  /** Optional: type of the related entity ('user' | 'loan' | 'legal_document'). */
  relatedEntityType?: string;
}

export class InitUploadResponseDto {
  /** Canonical Cloudinary public_id that will be assigned to this upload. */
  publicId!: string;
  /** The full Cloudinary upload endpoint the client should POST to. */
  uploadUrl!: string;
  cloudName!: string;
  apiKey!: string;
  timestamp!: number;
  signature!: string;
  folder!: string;
  resourceType!: string;
  deliveryType!: string;
  /** ISO-8601 timestamp after which the signed upload params expire (5 minutes). */
  expiresAt!: string;
}

// ─── Upload Complete ──────────────────────────────────────────────────────────

export class CompleteUploadDto {
  /** The public_id returned by Cloudinary after the client upload. Must match the one from init. */
  publicId!: string;
  /** Cloudinary asset_id returned in the upload response. */
  assetId!: string;
  /** Cloudinary resource_type ('image' | 'raw'). */
  resourceType!: string;
  /** Cloudinary delivery type ('upload' | 'authenticated'). */
  deliveryType!: string;
  /** File size in bytes. */
  bytes!: number;
  /** Cloudinary version number. */
  version!: number;
  /** Cloudinary secure_url from the upload response. */
  secureUrl!: string;
  /** Optional format string (e.g. 'jpg', 'pdf'). */
  format?: string;
  /** SHA-256 hash of the file computed client-side (hex string). */
  fileHash!: string;
  /** Original filename. */
  originalFilename!: string;
  /** MIME type of the uploaded file. */
  mimeType!: string;
  /** One of: 'kyc' | 'agreement' */
  category!: DocumentCategory;
  /** Fine-grained document type. */
  documentType!: string;
  /** Optional: Firestore ID of the related entity. */
  relatedEntityId?: string;
  /** Optional: type of the related entity. */
  relatedEntityType?: string;
  /** Optional: human-readable display label. */
  displayName?: string;
}

export class CompleteUploadResponseDto {
  message!: string;
  documentId!: string;
  status!: string;
}

// ─── Document Access ──────────────────────────────────────────────────────────

export class DocumentAccessResponseDto {
  documentId!: string;
  /** Short-lived signed Cloudinary URL (5 min TTL). */
  accessUrl!: string;
  expiresAt!: string;
}
