import { IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import type { KycStatus } from '../../auth/auth.types';

export class SubmitKycDto {
  @IsNotEmpty()
  @IsString()
  documentType!: string; // e.g., 'passport', 'national_id', 'drivers_license'

  @IsNotEmpty()
  @IsString()
  documentNumber!: string;

  @IsNotEmpty()
  @IsString()
  fullName!: string;

  @IsOptional()
  @IsString()
  issuingCountry?: string;

  @IsOptional()
  @IsString()
  expiryDate?: string;

  // In a real implementation, you'd handle file uploads
  // For now, we'll store document URLs or base64
  @IsOptional()
  @IsString()
  documentFrontUrl?: string;

  @IsOptional()
  @IsString()
  documentBackUrl?: string;

  @IsOptional()
  @IsString()
  selfieUrl?: string;

  @IsOptional()
  @IsString()
  profilePictureUrl?: string;
}

export class UpdateKycStatusDto {
  @IsNotEmpty()
  @IsEnum(['pending', 'under_review', 'approved', 'rejected'])
  status!: KycStatus;

  @IsOptional()
  @IsString()
  reviewNotes?: string;
}

export class KycSubmissionDto {
  id!: string;
  userId!: string;
  status!: KycStatus;
  documentType!: string;
  documentNumber!: string;
  fullName!: string;
  issuingCountry?: string;
  expiryDate?: string;
  documentFrontUrl?: string;
  documentBackUrl?: string;
  selfieUrl?: string;
  profilePictureUrl?: string;
  reviewNotes?: string;
  submittedAt!: Date;
  reviewedAt?: Date;
  reviewedBy?: string;
}
