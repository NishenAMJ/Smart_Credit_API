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
import { Type } from 'class-transformer';

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
  @Type(() => Number)
  @Min(1)
  @IsOptional()
  approvedPrincipalMinor?: number;

  @IsNumber()
  @Type(() => Number)
  @Min(0.01)
  @Max(100)
  @IsOptional()
  annualInterestRate?: number;

  @IsInt()
  @Type(() => Number)
  @Min(3)
  @Max(60)
  @IsOptional()
  approvedTenureMonths?: number;
}
