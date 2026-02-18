export interface Ad {
  id: string;
  userId: string;
  title: string;
  description: string;
  amount?: number;
  interestRate?: number;
  duration?: number;
  adType: 'borrower' | 'lender';
  status: 'pending' | 'approved' | 'rejected' | 'active' | 'closed';
  createdAt: FirebaseFirestore.Timestamp;
  reviewedAt?: FirebaseFirestore.Timestamp;
  approvedAt?: FirebaseFirestore.Timestamp;
  rejectedAt?: FirebaseFirestore.Timestamp;
  rejectionReason?: string;
  notes?: string;
  updatedAt?: FirebaseFirestore.Timestamp;
}
