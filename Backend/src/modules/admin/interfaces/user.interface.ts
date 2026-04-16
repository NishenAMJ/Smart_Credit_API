export type UserRole = 'admin' | 'borrower' | 'lender';

export type UserStatus = 'active' | 'suspended' | 'pending' | 'inactive';

export type FirestoreTimestampLike = {
  toDate?: () => Date;
  _seconds?: number;
};

export interface User {
  id: string;
  email: string;
  role: UserRole;
  status?: UserStatus;
  firstName?: string;
  lastName?: string;
  createdAt?: FirestoreTimestampLike;
  updatedAt?: FirestoreTimestampLike;
  suspendedAt?: FirestoreTimestampLike;
  suspensionReason?: string;
  passwordHash?: string;
}
