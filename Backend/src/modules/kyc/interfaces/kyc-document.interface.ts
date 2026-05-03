export interface KycDocument {
  id: string;
  userId: string;
  documentType: string;
  originalFilename?: string;
  mimeType?: string;
  fileHash?: string;
  cloudinaryPublicId?: string;
  cloudinaryResourceType?: string;
  cloudinaryDeliveryType?: string;
  documentUrl?: string;
  status: 'pending_review' | 'approved' | 'rejected' | 'expired' | 'deleted';
  submittedAt: any;
  reviewedAt?: any;
  reviewedBy?: string;
  rejectionReason?: string;
  notes?: string;
}
