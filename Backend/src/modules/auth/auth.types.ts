import type { Timestamp } from 'firebase-admin/firestore';

export const PUBLIC_USER_ROLES = ['borrower', 'lender'] as const;
export const USER_ROLES = [...PUBLIC_USER_ROLES, 'admin'] as const;

export type UserRole = (typeof USER_ROLES)[number];
export type PublicUserRole = (typeof PUBLIC_USER_ROLES)[number];
export type KycStatus = 'not_submitted' | 'pending' | 'under_review' | 'approved' | 'rejected';
export type AccountStatus = 'active' | 'suspended' | 'blocked';

export type UserDocument = {
  uid: string;
  role: UserRole[];
  fullName: string;
  photoURL: string;
  phone: string;
  email: string;
  emailLower: string;
  phoneNormalized: string;
  passwordHash: string;
  creditScore: number;
  rating: number;
  totalLoansCompleted: number;
  totalAmountLent: number;
  totalAmountBorrowed: number;
  kycStatus: KycStatus;
  accountStatus: AccountStatus;
  authProvider: 'local';
  createdAt: Timestamp;
  updatedAt: Timestamp;
  lastLoginAt?: Timestamp;
};

