import type {
  CreateDisputeInput,
  DisputeCategory,
  DisputeEventVisibility,
  DisputePriority,
  DisputeStatus,
} from '../interfaces/dispute.interface';

export class CreateDisputeDto implements CreateDisputeInput {
  loanId!: string;
  transactionId?: string;
  installmentId?: string;
  category!: DisputeCategory;
  subject!: string;
  description!: string;
  desiredOutcome!: string;
  disputedAmountMinor?: number;
  evidenceDocumentIds?: string[];
}

export class AddDisputeCommentDto {
  message!: string;
  documentIds?: string[];
  visibility?: DisputeEventVisibility;
}
export class ReopenDisputeDto {
  reason!: string;
}
export class AssignDisputeDto {
  adminId?: string;
}
export class ChangeDisputePriorityDto {
  priority!: DisputePriority;
  reason!: string;
}
export class RequestDisputeInformationDto {
  requestedFrom!: 'complainant' | 'respondent' | 'both';
  message!: string;
}
export class ResolveCanonicalDisputeDto {
  summary!: string;
  recommendedActions?: string[];
  internalNotes?: string;
}
export class CloseDisputeDto {
  reason!: string;
}
export type AdminDisputeQuery = {
  status?: DisputeStatus;
  priority?: DisputePriority;
  assignedAdminId?: string;
  search?: string;
  limit?: string;
  cursor?: string;
};
