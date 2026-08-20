import type { Timestamp } from 'firebase-admin/firestore';

export const PUBLIC_USER_ROLES = ['borrower', 'lender'] as const;
export const USER_ROLES = [...PUBLIC_USER_ROLES, 'admin'] as const;
export type UserRole = (typeof USER_ROLES)[number];
export type PublicUserRole = (typeof PUBLIC_USER_ROLES)[number];
export type KycStatus = 'not_submitted' | 'pending' | 'approved' | 'rejected';
export type AccountStatus = 'pending' | 'active' | 'suspended' | 'closed';

export type UserDocument = {
  userId: string;
  roles: UserRole[];
  primaryRole?: UserRole;
  searchTokens?: string[];
  fullName: string;
  photoUrl: string | null;
  phone: string;
  email: string;
  borrowerProfile: {
    dateOfBirth: Timestamp | null;
    occupation: string | null;
    monthlyIncomeMinor: number | null;
    creditScore: number | null;
  } | null;
  lenderProfile: {
    businessName: string | null;
    registrationNumber: string | null;
    description: string | null;
    rating: number;
  } | null;
  kycStatus: KycStatus;
  accountStatus: AccountStatus;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  lastLoginAt: Timestamp | null;
};

export type AuthCredentialDocument = {
  userId: string;
  passwordHash: string;
  passwordChangedAt: Timestamp;
  failedLoginAttempts: number;
  lockedUntil: Timestamp | null;
  createdAt: Timestamp;
  updatedAt: Timestamp;
};
