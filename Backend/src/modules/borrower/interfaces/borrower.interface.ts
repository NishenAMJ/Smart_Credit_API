import {
  LoanPurpose,
  LoanApplicationStatus,
  RepaymentMethod,
} from '../dto/loan-application.dto';

export { RepaymentMethod };

/**
 * Firestore document shape for `borrowers` records.
 */
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
  dateOfBirth: string;
  nic: string;
  address: {
    line1: string;
    line2?: string;
    city: string;
    district: string;
    province: string;
  };
  employmentStatus: string;
  monthlyIncome: number;
  occupation?: string;
  creditScore: number;
  profileComplete: boolean;
  kycVerified: boolean;
  totalLoans: number;
  activeLoans: number;
  totalBorrowed: number;
  totalRepaid: number;
  createdAt: FirebaseFirestore.Timestamp;
  updatedAt: FirebaseFirestore.Timestamp;
}

/**
 * Firestore document shape for `loan_applications` records.
 */
export interface LoanApplication {
  requestId: string;
  borrowerId: string;
  adId?: string;
  amount: number;
  loanPurpose: LoanPurpose;
  purpose?: string;
  purposeDescription?: string;
  tenureMonths: number;
  borrowerName?: string;
  borrowerPhotoURL?: string;
  borrowerRating?: number;
  smartScore?: number;
  borrowerCreditScore?: number;
  scoreRating?: string;
  scoreBreakdown?: Record<
    string,
    {
      subScore: number;
      weight: number;
      label: string;
    }
  >;
  scoreSnapshotAt?: FirebaseFirestore.Timestamp;
  requestedInterestRate?: number; // Optional requested rate
  preferredRepaymentMethod: RepaymentMethod;
  collateralDetails?: string[];
  additionalNotes?: string;
  status: LoanApplicationStatus;
  submittedAt?: FirebaseFirestore.Timestamp;
  reviewedAt?: FirebaseFirestore.Timestamp;
  reviewerNotes?: string;
  createdAt: FirebaseFirestore.Timestamp;
  updatedAt: FirebaseFirestore.Timestamp;
}

/**
 * Loan repayment lifecycle states stored in Firestore.
 */
export enum LoanStatus {
  ACTIVE = 'active',
  COMPLETED = 'completed',
  DEFAULTED = 'defaulted',
  OVERDUE = 'overdue',
  CANCELLED = 'cancelled',
}

/**
 * Firestore document shape for `loans` records.
 */
export interface Loan {
  loanId: string;
  requestId: string;
  borrowerId: string;
  lenderId: string;
  lenderName?: string;
  principalAmount: number;
  interestRate: number;
  tenureMonths: number;
  monthlyInstallment: number;
  outstandingBalance: number;
  totalInterest: number;
  status: LoanStatus;
  startDate: FirebaseFirestore.Timestamp;
  nextDueDate: FirebaseFirestore.Timestamp;
  endDate: FirebaseFirestore.Timestamp;
  repaymentsMade: number;
  createdAt: FirebaseFirestore.Timestamp;
  updatedAt: FirebaseFirestore.Timestamp;
}

/**
 * Repayment status values stored in repayment records.
 */
export enum RepaymentStatus {
  PENDING = 'pending',
  PENDING_VERIFICATION = 'pending_verification',
  COMPLETED = 'completed',
  FAILED = 'failed',
  OVERDUE = 'overdue',
}

/**
 * Firestore document shape for `repayments` records.
 */
export interface Repayment {
  repaymentId: string;
  loanId: string;
  borrowerId: string;
  lenderId: string;
  amount: number;
  principalPaid: number;
  interestPaid: number;
  paymentMethod: RepaymentMethod;
  transactionReference?: string;
  paymentProofUrl?: string;
  status: RepaymentStatus;
  dueDate: FirebaseFirestore.Timestamp;
  paidAt?: FirebaseFirestore.Timestamp;
  installmentNumber: number;
  createdAt: FirebaseFirestore.Timestamp;
}

/**
 * Aggregated borrower dashboard response returned by the API.
 */
export interface BorrowerDashboard {
  profile: Partial<BorrowerProfile>;
  activeLoans: number;
  pendingApplications: number;
  totalOutstanding: number;
  nextDueDate?: FirebaseFirestore.Timestamp;
  nextPaymentAmount?: number;
  creditScore: number;
  totalBorrowed: number;
  totalRepaid: number;
  recentActivity: Array<{
    type: 'loan' | 'repayment' | 'application';
    description: string;
    amount?: number;
    date: FirebaseFirestore.Timestamp;
  }>;
}
