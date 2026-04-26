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

export type DashboardMetric = {
  label: string;
  value: string;
  helper: string;
};

export type DashboardListItem = {
  id: string;
  title: string;
  subtitle: string;
  meta: string;
  status: string;
};

export type DashboardResponse = {
  user: AuthUser;
  role: UserRole;
  headline: string;
  summary: string;
  metrics: DashboardMetric[];
  primaryListTitle: string;
  primaryList: DashboardListItem[];
  secondaryListTitle: string;
  secondaryList: DashboardListItem[];
};

export type SessionResponse = {
  message: string;
  activeRole: UserRole;
  availableRoles: UserRole[];
  accountStatus: string;
  kycStatus: string;
  user: AuthUser;
};
