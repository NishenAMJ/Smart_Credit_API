export const PROFILE_PICTURE_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
] as const;

export const SENSITIVE_DOCUMENT_MIME_TYPES = [
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/webp',
] as const;

export type ProfilePictureMimeType =
  (typeof PROFILE_PICTURE_MIME_TYPES)[number];
export type SensitiveDocumentMimeType =
  (typeof SENSITIVE_DOCUMENT_MIME_TYPES)[number];

export type MediaUploadVisibility = 'public' | 'authenticated';
export type MediaUploadCategory = 'profile_picture' | 'kyc' | 'agreement';
export type MediaResourceType = 'image' | 'raw' | 'auto';

export type UploadedMedia = {
  assetId: string;
  publicId: string;
  version: number;
  format?: string;
  bytes: number;
  resourceType: string;
  deliveryType: string;
  secureUrl: string;
  originalFilename?: string;
  folder?: string;
  uploadedAt: string;
};

export type DirectUploadIntent = {
  category: MediaUploadCategory;
  publicId: string;
  folder: string;
  resourceType: Exclude<MediaResourceType, 'auto'>;
  deliveryType: 'upload' | 'authenticated';
  uploadUrl: string;
  cloudName: string;
  apiKey: string;
  timestamp: number;
  signature: string;
  expiresAt: string;
};

export type VerifiedUploadedMedia = UploadedMedia & {
  mimeType: string;
};
