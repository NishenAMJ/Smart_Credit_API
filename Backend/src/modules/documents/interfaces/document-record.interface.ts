export type DocumentCategory = 'kyc' | 'agreement';
export type DocumentStatus =
  | 'pending_review'
  | 'approved'
  | 'rejected'
  | 'expired'
  | 'deleted';

export type ReviewInfo = {
  reviewedAt?: unknown;
  reviewedBy?: string;
  rejectionReason?: string;
  notes?: string;
};

export type DeleteInfo = {
  deletedAt?: unknown;
  deletedBy?: string;
  reason?: string;
};

export interface DocumentRecord {
  id: string;
  userId: string;
  category: DocumentCategory;
  documentType: string;
  originalFilename: string;
  mimeType: string;
  fileHash: string;
  cloudinaryAssetId: string;
  cloudinaryPublicId: string;
  cloudinaryResourceType: string;
  cloudinaryDeliveryType: string;
  cloudinarySecureUrl?: string;
  cloudinaryVersion?: number;
  format?: string;
  fileSize: number;
  uploadStatus: 'uploaded' | 'failed';
  status: DocumentStatus;
  uploadedAt: unknown;
  createdAt: unknown;
  updatedAt: unknown;
  deletedAt?: unknown;
  review?: ReviewInfo;
  deletion?: DeleteInfo;
}
