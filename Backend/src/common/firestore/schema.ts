import { Timestamp } from 'firebase-admin/firestore';

export const COLLECTIONS = {
  users: 'users',
  authCredentials: 'authCredentials',
  kycSubmissions: 'kycSubmissions',
  loanListings: 'loanListings',
  loanApplications: 'loanApplications',
  loans: 'loans',
  installments: 'installments',
  transactions: 'transactions',
  disputes: 'disputes',
  disputeEvents: 'events',
  documents: 'documents',
  notifications: 'notifications',
  conversations: 'conversations',
  messages: 'messages',
  legalDocuments: 'legalDocuments',
  legalAcceptances: 'legalAcceptances',
  loanAgreements: 'loanAgreements',
  loanAgreementAcceptances: 'loanAgreementAcceptances',
  userLocations: 'userLocations',
  auditLogs: 'auditLogs',
  systemSettings: 'systemSettings',
  smsDeliveries: 'smsDeliveries',
} as const;

export type UserRole = 'borrower' | 'lender' | 'admin';
export type AccountStatus = 'pending' | 'active' | 'suspended' | 'closed';
export type KycStatus = 'not_submitted' | 'pending' | 'approved' | 'rejected';
export type Currency = 'LKR';

export interface UserDocument {
  userId: string;
  email: string;
  phone: string;
  fullName: string;
  photoUrl: string | null;
  roles: UserRole[];
  accountStatus: AccountStatus;
  kycStatus: KycStatus;
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
  createdAt: Timestamp;
  updatedAt: Timestamp;
  lastLoginAt: Timestamp | null;
}

export interface AuthCredentialDocument {
  userId: string;
  passwordHash: string;
  passwordChangedAt: Timestamp;
  failedLoginAttempts: number;
  lockedUntil: Timestamp | null;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export type ListingStatus =
  | 'draft'
  | 'pending_review'
  | 'active'
  | 'paused'
  | 'rejected'
  | 'expired'
  | 'closed';

export interface LoanListingDocument {
  listingId: string;
  lenderId: string;
  title: string;
  description: string;
  purposeCategories: string[];
  minAmountMinor: number;
  maxAmountMinor: number;
  minInterestRateAnnual: number;
  maxInterestRateAnnual: number;
  minTenureMonths: number;
  maxTenureMonths: number;
  availableCapitalMinor: number;
  currency: Currency;
  repaymentFrequency: 'monthly';
  status: ListingStatus;
  adminReview: {
    reviewedBy: string | null;
    reviewedAt: Timestamp | null;
    rejectionReason: string | null;
  };
  publishedAt: Timestamp | null;
  expiresAt: Timestamp | null;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export type ApplicationStatus =
  | 'draft'
  | 'submitted'
  | 'under_review'
  | 'approved'
  | 'rejected'
  | 'withdrawn'
  | 'converted';

export interface LoanApplicationDocument {
  applicationId: string;
  listingId: string;
  lenderId: string;
  borrowerId: string;
  requestedPrincipalMinor: number;
  requestedTenureMonths: number;
  requestedPurpose: string;
  purposeDescription: string;
  status: ApplicationStatus;
  lenderDecision: {
    approvedPrincipalMinor: number | null;
    annualInterestRate: number | null;
    approvedTenureMonths: number | null;
    decisionNote: string | null;
    decidedAt: Timestamp | null;
  };
  convertedLoanId: string | null;
  submittedAt: Timestamp | null;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export type LoanStatus =
  | 'pending_disbursement'
  | 'active'
  | 'overdue'
  | 'completed'
  | 'defaulted'
  | 'cancelled';

export interface LoanDocument {
  loanId: string;
  applicationId: string;
  listingId: string;
  lenderId: string;
  borrowerId: string;
  currency: Currency;
  principalMinor: number;
  annualInterestRate: number;
  interestAmountMinor: number;
  totalRepayableMinor: number;
  monthlyInstallmentMinor: number;
  tenureMonths: number;
  amountPaidMinor: number;
  remainingBalanceMinor: number;
  status: LoanStatus;
  approvedAt: Timestamp;
  disbursedAt: Timestamp | null;
  firstPaymentDueAt: Timestamp | null;
  maturityDate: Timestamp | null;
  completedAt: Timestamp | null;
  termsVersion: number;
  currentAgreementId?: string;
  agreementStatus?: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export type InstallmentStatus =
  | 'scheduled'
  | 'due'
  | 'paid'
  | 'overdue'
  | 'waived';

export interface InstallmentDocument {
  installmentId: string;
  loanId: string;
  lenderId: string;
  borrowerId: string;
  sequence: number;
  currency: Currency;
  amountDueMinor: number;
  status: InstallmentStatus;
  dueAt: Timestamp;
  paidTransactionId: string | null;
  paidAt: Timestamp | null;
  note: string | null;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export type TransactionType =
  | 'disbursement'
  | 'repayment'
  | 'platform_fee'
  | 'listing_boost'
  | 'refund'
  | 'adjustment';

export interface TransactionDocument {
  transactionId: string;
  type: TransactionType;
  status: 'pending' | 'completed' | 'failed' | 'reversed';
  currency: Currency;
  amountMinor: number;
  platformFeeMinor: number;
  lenderId: string | null;
  borrowerId: string | null;
  loanId: string | null;
  installmentId: string | null;
  listingId: string | null;
  paymentMethod: 'bank_transfer' | 'qr' | 'cash' | 'card' | 'system' | null;
  externalReference: string | null;
  idempotencyKey: string;
  receiptDocumentId: string | null;
  note: string | null;
  initiatedByUserId: string;
  completedAt: Timestamp | null;
  createdAt: Timestamp;
}

export type LoanAgreementStatus =
  | 'awaiting_signatures'
  | 'awaiting_disbursement'
  | 'awaiting_borrower_signature'
  | 'partially_accepted'
  | 'finalizing'
  | 'finalization_failed'
  | 'fully_accepted'
  | 'superseded'
  | 'cancelled';

export interface LoanAgreementDocument {
  agreementId: string;
  loanId: string;
  applicationId: string;
  listingId: string;
  version: number;
  status: LoanAgreementStatus;
  borrowerId: string;
  lenderId: string;
  borrowerAcceptance: {
    accepted: boolean;
    signedName: string | null;
    acceptedAt: Timestamp | null;
  };
  lenderAcceptance: {
    accepted: boolean;
    signedName: string | null;
    acceptedAt: Timestamp | null;
  };
  disbursementConfirmation: {
    confirmed: boolean;
    confirmedByLenderId: string | null;
    confirmedAt: Timestamp | null;
    principalMinor: number | null;
    externalReference: string | null;
    ipAddressHash: string | null;
    userAgent: string | null;
  };
  termsHash: string;
  updatedAt: Timestamp;
  finalizedAt: Timestamp | null;
  finalizationError: string | null;
}

export interface LoanAgreementAcceptanceDocument {
  acceptanceId: string;
  agreementId: string;
  loanId: string;
  userId: string;
  role: 'borrower' | 'lender';
  agreementVersion: number;
  termsHash: string;
  signedName: string;
  consentAccepted: true;
  consentTextVersion: 'loan_agreement_consent_v1';
  ipAddressHash: string | null;
  userAgent: string | null;
  acceptedAt: Timestamp;
  fundsReceivedConfirmed: boolean;
}

export type DisputeStatus =
  | 'open'
  | 'under_review'
  | 'awaiting_response'
  | 'escalated'
  | 'resolved'
  | 'closed';

export interface DisputeDocument {
  disputeId: string;
  disputeCode: string;
  loanId: string;
  transactionId: string | null;
  installmentId: string | null;
  complainantId: string;
  complainantRole: 'borrower' | 'lender';
  respondentId: string;
  respondentRole: 'borrower' | 'lender';
  borrowerId: string;
  lenderId: string;
  borrowerName: string;
  lenderName: string;
  category: 'payment' | 'loan_terms' | 'fraud' | 'conduct' | 'other';
  subject: string;
  description: string;
  desiredOutcome: string;
  disputedAmountMinor: number | null;
  currency: Currency;
  evidenceDocumentIds: string[];
  status: DisputeStatus;
  priority: 'low' | 'medium' | 'high' | 'critical';
  assignedAdminId: string | null;
  resolution: {
    summary: string;
    recommendedActions: string[];
    issuedByAdminId: string;
    issuedAt: Timestamp;
    reopenUntil: Timestamp;
  } | null;
  acknowledgements: Record<string, Timestamp>;
  reopenCount: number;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  resolvedAt: Timestamp | null;
  closedAt: Timestamp | null;
}

export interface DisputeEventDocument {
  eventId: string;
  disputeId: string;
  type: string;
  actorUserId: string;
  actorRole: UserRole | 'system';
  message: string;
  documentIds: string[];
  visibility: 'shared' | 'admin';
  previousStatus: DisputeStatus | null;
  nextStatus: DisputeStatus | null;
  createdAt: Timestamp;
}

export const installmentIdFor = (sequence: number): string =>
  `month_${String(sequence).padStart(3, '0')}`;

export const repaymentTransactionIdFor = (
  loanId: string,
  installmentId: string,
): string => `repayment_${loanId}_${installmentId}`;
