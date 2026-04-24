export type UserRole = 'borrower' | 'lender';
export type AuthMode = 'login' | 'register';

export type AuthUser = {
  uid: string;
  fullName: string;
  email: string;
  phone: string;
  role: UserRole;
  kycStatus: string;
};

export type RegisterPayload = {
  fullName: string;
  email: string;
  phone: string;
  password: string;
  role: UserRole;
};

export type LoginPayload = {
  identifier: string;
  password: string;
  role: UserRole;
};

export type RegisterResponse = {
  message: string;
  user: AuthUser;
};

export type AuthResponse = {
  accessToken: string;
  user: AuthUser;
};

export type MeResponse = {
  user: AuthUser;
};

export type StoredSession = {
  accessToken: string;
  user: AuthUser;
};

