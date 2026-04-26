export interface KycDocument {
  id: string;
  userId: string;
  fullName?: string;
  email?: string;
  phone?: string;
  documentType: string;
  documentUrl?: string;
  status: 'pending' | 'approved' | 'rejected';
  submittedAt: any;
  reviewedAt?: any;
  reviewedBy?: string;
  rejectionReason?: string;
  notes?: string;
}
