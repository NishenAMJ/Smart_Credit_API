import type { DocumentCategory } from '../interfaces/document-record.interface';
import {
  IsIn,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUrl,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

const DOCUMENT_CATEGORIES = [
  'kyc',
  'agreement',
  'dispute_evidence',
  'payment_receipt',
] as const;
const DOCUMENT_ENTITY_TYPES = [
  'user',
  'loan',
  'ad_boost',
  'legal_document',
  'loan_agreement',
  'dispute',
] as const;
const DOCUMENT_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'application/pdf',
] as const;

// ─── Upload Init ─────────────────────────────────────────────────────────────

export class InitUploadDto {
  /** One of: 'kyc' | 'agreement' */
  @IsIn(DOCUMENT_CATEGORIES)
  category!: DocumentCategory;
  /** Fine-grained type, e.g. 'nic_front', 'bank_document', 'loan_agreement_pdf'. */
  @IsString()
  @IsNotEmpty()
  @MaxLength(80)
  documentType!: string;
  /** Original filename provided by the client (used to derive the Cloudinary publicId). */
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  fileName!: string;
  /** MIME type the client intends to upload, e.g. 'image/jpeg' or 'application/pdf'. */
  @IsIn(DOCUMENT_MIME_TYPES)
  contentType!: string;
  /** Optional: Firestore ID of the related entity (e.g. a loan or legal document). */
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  relatedEntityId?: string;
  /** Optional: type of the related entity ('user' | 'loan' | 'legal_document'). */
  @IsOptional()
  @IsIn(DOCUMENT_ENTITY_TYPES)
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
  @IsString()
  @IsNotEmpty()
  @MaxLength(300)
  publicId!: string;
  /** Cloudinary asset_id returned in the upload response. */
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  assetId!: string;
  /** Cloudinary resource_type ('image' | 'raw'). */
  @IsIn(['image', 'raw'])
  resourceType!: string;
  /** Cloudinary delivery type ('upload' | 'authenticated'). */
  @IsIn(['upload', 'authenticated'])
  deliveryType!: string;
  /** File size in bytes. */
  @IsNumber({ allowInfinity: false, allowNaN: false })
  @Min(1)
  @Max(10 * 1024 * 1024)
  bytes!: number;
  /** Cloudinary version number. */
  @IsInt()
  @Min(1)
  version!: number;
  /** Cloudinary secure_url from the upload response. */
  @IsUrl({ protocols: ['https'], require_protocol: true })
  @MaxLength(1000)
  secureUrl!: string;
  /** Optional format string (e.g. 'jpg', 'pdf'). */
  @IsOptional()
  @IsString()
  @MaxLength(20)
  format?: string;
  /** SHA-256 hash of the file computed client-side (hex string). */
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  fileHash!: string;
  /** Original filename. */
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  originalFilename!: string;
  /** MIME type of the uploaded file. */
  @IsIn(DOCUMENT_MIME_TYPES)
  mimeType!: string;
  /** One of: 'kyc' | 'agreement' */
  @IsIn(DOCUMENT_CATEGORIES)
  category!: DocumentCategory;
  /** Fine-grained document type. */
  @IsString()
  @IsNotEmpty()
  @MaxLength(80)
  documentType!: string;
  /** Optional: Firestore ID of the related entity. */
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  relatedEntityId?: string;
  /** Optional: type of the related entity. */
  @IsOptional()
  @IsIn(DOCUMENT_ENTITY_TYPES)
  relatedEntityType?: string;
  /** Optional: human-readable display label. */
  @IsOptional()
  @IsString()
  @MaxLength(120)
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
  fileName!: string;
  mimeType!: string;
}
