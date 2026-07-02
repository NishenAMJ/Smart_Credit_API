import {
  IsOptional,
  IsNumber,
  IsString,
  IsEnum,
  Min,
  Max,
} from 'class-validator';

export enum LoanStatusFilter {
  ACTIVE = 'active',
  PENDING = 'pending',
  COMPLETED = 'completed',
  DEFAULTED = 'defaulted',
}

export class FilterLoansDto {
  @IsOptional()
  @IsNumber()
  @Min(0)
  minAmount?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  maxAmount?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  minInterestRate?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  maxInterestRate?: number;

  @IsOptional()
  @IsNumber()
  @Min(1)
  minDuration?: number;

  @IsOptional()
  @IsNumber()
  @Min(1)
  maxDuration?: number;

  @IsOptional()
  @IsEnum(LoanStatusFilter)
  status?: LoanStatusFilter;

  @IsOptional()
  @IsString()
  category?: string;
}
