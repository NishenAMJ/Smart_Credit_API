export type UserRole = 'borrower' | 'lender' | 'admin';
export type PublicUserRole = 'borrower' | 'lender';
export type AuthMode = 'login' | 'register';

export type AuthUser = {
  uid: string;
  fullName: string;
  email: string;
  phone: string;
  role: UserRole;
  kycStatus: string;
};

export type LoginPayload = {
  identifier: string;
  password: string;
  role: UserRole;
};

export type RegisterPayload = {
  fullName: string;
  email: string;
  phone: string;
  password: string;
  role: PublicUserRole;
};

export type AuthResponse = {
  accessToken: string;
  user: AuthUser;
};

export type RegisterResponse = {
  message: string;
  user: AuthUser;
};

export type SubmitKycPayload = {
  documentType: string;
  documentNumber: string;
  fullName: string;
  issuingCountry?: string;
  expiryDate?: string;
  documentFrontUrl?: string;
  documentBackUrl?: string;
  selfieUrl?: string;
};

export type KycSubmissionDto = {
  id: string;
  userId: string;
  status: 'not_submitted' | 'pending' | 'under_review' | 'approved' | 'rejected';
  documentType: string;
  documentNumber: string;
  fullName: string;
  issuingCountry?: string;
  expiryDate?: string;
  documentFrontUrl?: string;
  documentBackUrl?: string;
  selfieUrl?: string;
  submittedAt: string;
};

export type SubmitKycResponse = {
  message: string;
  submission: KycSubmissionDto;
};

export type StoredSession = {
  accessToken: string;
  user: AuthUser;
};

export type LoginFormState = {
  identifier: string;
  password: string;
};

export type KycFormState = {
  documentType: string;
  documentNumber: string;
  fullName: string;
  issuingCountry: string;
  expiryDate: string;
  documentFrontUrl: string;
  documentBackUrl: string;
  selfieUrl: string;
};

export type RegisterFormState = {
  fullName: string;
  email: string;
  phone: string;
  password: string;
  confirmPassword: string;
  role: PublicUserRole;
  kyc: KycFormState;
};
