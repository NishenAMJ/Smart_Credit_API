import type { KycStatus, UserRole } from "./auth";

export type FirestoreTimestampLike = unknown;

export type UserAddress = {
  line1?: string;
  city?: string;
  district?: string;
  province?: string;
};

export type UserDocument = {
  uid: string;
  role: UserRole[];
  fullName: string;
  photoURL?: string;
  phone: string;
  email: string;
  nic?: string;
  dateOfBirth?: string;
  employmentStatus?: string;
  address?: UserAddress;
  creditScore: number;
  rating?: number;
  totalLoansCompleted?: number;
  totalAmountLent?: number;
  totalAmountBorrowed?: number;
  kycStatus: KycStatus | "approved";
  createdAt?: FirestoreTimestampLike;
  updatedAt?: FirestoreTimestampLike;
};

export type AdDocument = {
  adId: string;
  lenderId: string;
  maxAmount: number;
  preferredInterestRate: number;
  minTenureMonths: number;
  maxTenureMonths: number;
  preferredPurposes: string[];
  location: string;
  status: "active" | "inactive";
  createdAt?: FirestoreTimestampLike;
  expiresAt?: FirestoreTimestampLike;
  lenderName: string;
  lenderPhotoURL?: string;
  lenderRating?: number;
};

export type LoanRequestDocument = {
  requestId: string;
  adId: string;
  borrowerId: string;
  amount: number;
  tenureMonths: number;
  purpose: string;
  status: "pending" | "accepted" | "rejected";
  createdAt?: FirestoreTimestampLike;
  borrowerName: string;
  borrowerPhotoURL?: string;
  borrowerRating?: number;
  borrowerCreditScore?: number;
};

export type LoanDocument = {
  loanId: string;
  adId: string;
  requestId: string;
  lenderId: string;
  borrowerId: string;
  principalAmount: number;
  interestRate: number;
  tenureMonths: number;
  startDate?: FirestoreTimestampLike;
  endDate?: FirestoreTimestampLike;
  nextDueDate?: FirestoreTimestampLike;
  status: "active" | "completed";
  totalRepayable: number;
  createdAt?: FirestoreTimestampLike;
  signedAt?: FirestoreTimestampLike;
  borrowerName?: string;
  borrowerPhotoURL?: string;
  borrowerRating?: number;
};

export type KycSubmissionDraft = {
  nicNumber: string;
  nicFrontUrl?: string;
  nicBackUrl?: string;
  addressProofNumber?: string;
  addressProofUrl?: string;
  bankAccountNumber?: string;
  bankName?: string;
  branchCode?: string;
  accountType?: string;
  bankDocumentUrl?: string;
  profilePhotoUrl?: string;
  status: KycStatus;
  submittedAt?: FirestoreTimestampLike;
};

export type StoredKycFiles = {
  nicFrontUrl?: string;
  nicBackUrl?: string;
  addressProofUrl?: string;
  bankDocumentUrl?: string;
  profilePhotoUrl?: string;
  addressProofNumber?: string;
  bankAccountNumber?: string;
  bankName?: string;
  branchCode?: string;
  accountType?: string;
  submittedAt?: FirestoreTimestampLike;
};
