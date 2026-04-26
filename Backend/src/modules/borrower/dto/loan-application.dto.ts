import {
  IsString,
  IsNotEmpty,
  IsNumber,
  IsEnum,
  IsOptional,
  IsArray,
  Min,
  Max,
} from 'class-validator';

/**
 * Supported borrower reasons for requesting a loan.
 */
export enum LoanPurpose {
  EDUCATION = 'education',
  BUSINESS = 'business',
  HOME_IMPROVEMENT = 'home_improvement',
  MEDICAL = 'medical',
  VEHICLE = 'vehicle',
  DEBT_CONSOLIDATION = 'debt_consolidation',
  PERSONAL = 'personal',
  OTHER = 'other',
}

/**
 * Supported repayment channels for borrower payments.
 */
export enum RepaymentMethod {
  BANK_TRANSFER = 'bank_transfer',
  QR_PAYMENT = 'qr_payment',
  CASH = 'cash',
}

/**
 * Lifecycle states used by borrower loan applications.
 */
export enum LoanApplicationStatus {
  DRAFT = 'draft',
  PENDING = 'pending',
  UNDER_REVIEW = 'under_review',
  APPROVED = 'approved',
  REJECTED = 'rejected',
  CANCELLED = 'cancelled',
  FUNDED = 'funded',
}

/**
 * Validates payloads for creating new loan applications.
 */
export class CreateLoanApplicationDto {
  @IsString()
  @IsNotEmpty()
  borrowerId!: string;

  @IsString()
  @IsOptional()
  selectedLoanId?: string;

  @IsNumber()
  @Min(10000) // Min LKR 10,000
  @Max(5000000) // Max LKR 5,000,000
  loanAmount!: number;

  @IsEnum(LoanPurpose)
  loanPurpose!: LoanPurpose;

  @IsString()
  @IsOptional()
  purposeDescription?: string;

  @IsNumber()
  @Min(3)
  @Max(60) // 3 to 60 months
  loanTermMonths!: number;

  @IsEnum(RepaymentMethod)
  preferredRepaymentMethod!: RepaymentMethod;

  @IsArray()
  @IsOptional()
  collateralDetails?: string[];

  @IsString()
  @IsOptional()
  additionalNotes?: string;
}

/**
 * Validates partial updates for draft loan applications.
 */
export class UpdateLoanApplicationDto {
  @IsNumber()
  @Min(10000)
  @Max(5000000)
  @IsOptional()
  loanAmount?: number;

  @IsEnum(LoanPurpose)
  @IsOptional()
  loanPurpose?: LoanPurpose;

  @IsString()
  @IsOptional()
  purposeDescription?: string;

  @IsNumber()
  @Min(3)
  @Max(60)
  @IsOptional()
  loanTermMonths?: number;

  @IsEnum(RepaymentMethod)
  @IsOptional()
  preferredRepaymentMethod?: RepaymentMethod;

  @IsArray()
  @IsOptional()
  collateralDetails?: string[];

  @IsString()
  @IsOptional()
  additionalNotes?: string;
}
