export interface Ad {
  id: string;
  adId?: string;
  lenderId: string;
  maxAmount: number;
  preferredInterestRate: number;
  minTenureMonths: number;
  maxTenureMonths: number;
  preferredPurposes: string[];
  location: string;
  lenderName?: string;
  lenderPhotoURL?: string;
  lenderRating?: number;
  status: 'pending' | 'approved' | 'rejected' | 'active' | 'closed';
  createdAt: FirebaseFirestore.Timestamp;
  expiresAt?: FirebaseFirestore.Timestamp;
  reviewedAt?: FirebaseFirestore.Timestamp;
  approvedAt?: FirebaseFirestore.Timestamp;
  rejectedAt?: FirebaseFirestore.Timestamp;
  rejectionReason?: string;
  notes?: string;
  updatedAt?: FirebaseFirestore.Timestamp;
}
