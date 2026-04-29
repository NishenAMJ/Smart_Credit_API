/** @format */

export type LoanStatus =
  | "active"
  | "completed"
  | "defaulted"
  | "overdue"
  | "cancelled";

export type ApplicationStatus =
  | "draft"
  | "pending"
  | "under_review"
  | "approved"
  | "rejected"
  | "cancelled"
  | "funded";

export type PaymentStatus = "completed" | "pending" | "failed" | string;

export interface BorrowerAddress {
  line1?: string;
  line2?: string;
  city?: string;
  district?: string;
  province?: string;
}

export interface BorrowerLoan {
  loanId: string;
  adId?: string;
  requestId?: string;
  lenderId?: string;
  lenderName?: string;
  lenderLocation?: string;
  location?: string;
  city?: string;
  district?: string;
  province?: string;
  branchAddress?: string;
  address?: string;
  principalAmount?: number;
  minAmount?: number;
  maxAmount?: number;
  durationMonths?: number;
  tenureMonths?: number;
  minTenureMonths?: number;
  maxTenureMonths?: number;
  preferredPurposes?: string[];
  amount?: number;
  isFeatured?: boolean;
  interestRate?: number;
  preferredInterestRate?: number;
  totalRepayable?: number;
  monthlyInstallment?: number;
  outstandingBalance?: number;
  status?: LoanStatus;
  startDate?: string;
  nextDueDate?: string;
  endDate?: string;
}

export interface BorrowerTransaction {
  transactionId?: string;
  repaymentId?: string;
  loanId?: string;
  type?: string;
  status?: PaymentStatus;
  timestamp?: string;
  paidAt?: string;
  createdAt?: string;
  paymentMethod?: string;
  lenderName?: string;
  amount?: number;
}

export interface BorrowerRepayment {
  repaymentId?: string;
  paymentId?: string;
  transactionId?: string;
  loanId?: string;
  amount?: number;
  status?: string;
  dueDate?: string;
  paidAt?: string;
  transactionReference?: string;
  paymentProofUrl?: string;
  paymentMethod?: string;
  type?: string;
  timestamp?: string;
  lenderName?: string;
}

export interface BorrowerApplication {
  applicationId?: string;
  requestId?: string;
  adId?: string;
  status?: ApplicationStatus;
  createdAt?: string;
  updatedAt?: string;
  loanTitle?: string;
  amount?: number;
  tenureMonths?: number;
  purpose?: string;
  loanPurpose?: string;
  purposeDescription?: string;
  borrowerName?: string;
  borrowerPhotoURL?: string;
  smartScore?: number;
}

export interface BorrowerProfile {
  userId: string;
  fullName: string;
  email: string;
  phone: string;
  photoURL?: string;
  profilePicture?: string;
  profilePictureUrl?: string;
  profilePicUrl?: string;
  profilePhotoUrl?: string;
  imageUrl?: string;
  avatarUrl?: string;
  nic: string;
  dateOfBirth: string;
  createdAt?: string;
  creditScore?: number;
  kycVerified?: boolean;
  profileComplete?: boolean;
  employmentStatus?: string;
  monthlyIncome?: number;
  occupation?: string;
  address?: BorrowerAddress;
}

export interface CreditScoreSummary {
  smartScore?: number;
  creditLimit?: number;
}
