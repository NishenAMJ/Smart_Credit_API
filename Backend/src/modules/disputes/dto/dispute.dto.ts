import type {
  CreateDisputeInput,
  DisputeCategory,
  DisputeEventVisibility,
  DisputePriority,
  DisputeStatus,
} from '../interfaces/dispute.interface';
import {
  ArrayMaxSize,
  IsArray,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';

export class CreateDisputeDto implements CreateDisputeInput {
  @IsString()
  @IsOptional()
  @MaxLength(120)
  loanId?: string;

  @IsString()
  @IsOptional()
  transactionId?: string;

  @IsString()
  @IsOptional()
  installmentId?: string;

  @IsIn(['payment', 'loan_terms', 'fraud', 'conduct', 'other'])
  category!: DisputeCategory;

  @IsString()
  @IsNotEmpty()
  @MaxLength(160)
  subject!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(4000)
  description!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(1000)
  desiredOutcome!: string;

  @IsInt()
  @Min(0)
  @IsOptional()
  disputedAmountMinor?: number;

  @IsArray()
  @ArrayMaxSize(5)
  @IsString({ each: true })
  @IsOptional()
  evidenceDocumentIds?: string[];
}

export class AddDisputeCommentDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(2000)
  message!: string;

  @IsArray()
  @ArrayMaxSize(5)
  @IsString({ each: true })
  @IsOptional()
  documentIds?: string[];

  @IsIn(['shared', 'admin'])
  @IsOptional()
  visibility?: DisputeEventVisibility;
}
export class ReopenDisputeDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(1000)
  reason!: string;
}
export class AssignDisputeDto {
  @IsString()
  @IsOptional()
  adminId?: string;
}
export class ChangeDisputePriorityDto {
  @IsIn(['low', 'medium', 'high', 'critical'])
  priority!: DisputePriority;

  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  reason!: string;
}
export class RequestDisputeInformationDto {
  @IsIn(['complainant', 'respondent', 'both'])
  requestedFrom!: 'complainant' | 'respondent' | 'both';

  @IsString()
  @IsNotEmpty()
  @MaxLength(1000)
  message!: string;
}
export class ResolveCanonicalDisputeDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(2000)
  summary!: string;

  @IsArray()
  @ArrayMaxSize(10)
  @IsString({ each: true })
  @IsOptional()
  recommendedActions?: string[];

  @IsString()
  @MaxLength(2000)
  @IsOptional()
  internalNotes?: string;
}
export class CloseDisputeDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(1000)
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
