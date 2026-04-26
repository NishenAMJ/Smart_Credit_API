export type UserRole = 'admin' | 'borrower' | 'lender';

export type UserStatus = 'active' | 'suspended' | 'pending' | 'inactive';

export type FirestoreTimestampLike = {
  toDate?: () => Date;
  _seconds?: number;
};

export interface User {
  id: string;
  email: string;
  role: UserRole | UserRole[];
  status?: UserStatus;
  uid?: string;
  fullName?: string;
  photoURL?: string;
  firstName?: string;
  lastName?: string;
  phone?: string;
  department?: string;
  adminRole?: string;
  creditScore?: number;
  rating?: number;
  totalLoansCompleted?: number;
  totalAmountLent?: number;
  totalAmountBorrowed?: number;
  kycStatus?: 'approved' | 'pending' | 'rejected';
  createdAt?: FirestoreTimestampLike;
  updatedAt?: FirestoreTimestampLike;
  suspendedAt?: FirestoreTimestampLike;
  suspensionReason?: string;
  passwordHash?: string;
}
