export type UserRole = "borrower" | "lender";

export type KycStatus =
  | "not_submitted"
  | "pending"
  | "approved"
  | "rejected";

export type LoginPayload = {
  identifier: string;
  password: string;
};

export type RegisterPayload = {
  role: UserRole;
  fullName: string;
  email: string;
  phoneNumber: string;
  nic: string;
  birthDate: string;
  password: string;
};

export type VerifiedRegistrationPayload = Omit<RegisterPayload, "password"> & {
  passwordHash: string;
};
