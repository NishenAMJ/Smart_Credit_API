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
  applicationId?: string;
  lenderId?: string;
  lenderName?: string;
  lenderLocation?: string;
  location?: string;
  city?: string;
  district?: string;
  province?: string;
  branchAddress?: string;
  address?: string;
  loanAmount?: number;
  minAmount?: number;
  maxAmount?: number;
  durationMonths?: number;
  loanTermMonths?: number;
  amount?: number;
  isFeatured?: boolean;
  interestRate?: number;
  status?: LoanStatus;
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
  type?: string;
  timestamp?: string;
  lenderName?: string;
}

export interface BorrowerApplication {
  applicationId?: string;
  status?: ApplicationStatus;
  createdAt?: string;
  updatedAt?: string;
  loanTitle?: string;
  requestedAmount?: number;
  purpose?: string;
  loanPurpose?: string;
  purposeDescription?: string;
}

export interface BorrowerProfile {
  userId: string;
  fullName: string;
  email: string;
  phone: string;
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
