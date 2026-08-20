export type DisputeRole = 'borrower' | 'lender' | 'admin';
export type DisputeCategory =
  | 'payment'
  | 'loan_terms'
  | 'fraud'
  | 'conduct'
  | 'other';
export type DisputeStatus =
  | 'open'
  | 'under_review'
  | 'awaiting_response'
  | 'escalated'
  | 'resolved'
  | 'closed';
export type DisputePriority = 'low' | 'medium' | 'high' | 'critical';
export type DisputeEventVisibility = 'shared' | 'admin';

export interface DisputeResolution {
  summary: string;
  recommendedActions: string[];
  issuedByAdminId: string;
  issuedAt: FirebaseFirestore.Timestamp;
  reopenUntil: FirebaseFirestore.Timestamp;
}

export interface Dispute {
  id: string;
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
  category: DisputeCategory;
  subject: string;
  description: string;
  desiredOutcome: string;
  disputedAmountMinor: number | null;
  currency: 'LKR';
  evidenceDocumentIds: string[];
  status: DisputeStatus;
  priority: DisputePriority;
  assignedAdminId: string | null;
  resolution: DisputeResolution | null;
  acknowledgements: Record<string, FirebaseFirestore.Timestamp>;
  reopenCount: number;
  createdAt: FirebaseFirestore.Timestamp;
  updatedAt: FirebaseFirestore.Timestamp;
  resolvedAt: FirebaseFirestore.Timestamp | null;
  closedAt: FirebaseFirestore.Timestamp | null;
}

export interface DisputeEvent {
  id: string;
  eventId: string;
  disputeId: string;
  type: string;
  actorUserId: string;
  actorRole: DisputeRole | 'system';
  message: string;
  documentIds: string[];
  visibility: DisputeEventVisibility;
  previousStatus: DisputeStatus | null;
  nextStatus: DisputeStatus | null;
  createdAt: FirebaseFirestore.Timestamp;
}

export interface CreateDisputeInput {
  loanId: string;
  transactionId?: string;
  installmentId?: string;
  category: DisputeCategory;
  subject: string;
  description: string;
  desiredOutcome: string;
  disputedAmountMinor?: number;
  evidenceDocumentIds?: string[];
}
