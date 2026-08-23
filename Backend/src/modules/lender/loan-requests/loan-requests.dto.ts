import {
  IsIn,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

export type LoanRequestDecisionResponse = {
  requestId: string;
  status: 'converted' | 'rejected';
  updatedAt: string;
  loanId?: string;
  agreementId?: string;
};

export class LoanRequestDecisionDto {
  @IsIn(['approve', 'reject'])
  decision!: 'approve' | 'reject';

  @IsString()
  @MaxLength(1000)
  @IsOptional()
  note?: string;

  @IsInt()
  @Min(1)
  @IsOptional()
  approvedPrincipalMinor?: number;

  @IsNumber()
  @Min(0)
  @Max(100)
  @IsOptional()
  annualInterestRate?: number;

  @IsInt()
  @Min(1)
  @Max(120)
  @IsOptional()
  approvedTenureMonths?: number;
}
