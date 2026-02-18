import {
  IsString,
  IsNumber,
  IsEnum,
  IsOptional,
  Min,
  Max,
} from 'class-validator';

export enum LoanStatus {
  PENDING = 'pending',
  ACTIVE = 'active',
  COMPLETED = 'completed',
  DEFAULTED = 'defaulted',
}

export class CreateLoanDto {
  @IsString()
  borrowerId: string;

  @IsString()
  lenderId: string;

  @IsNumber()
  @Min(0)
  amount: number;

  @IsNumber()
  @Min(0)
  @Max(100)
  interestRate: number;

  @IsNumber()
  @Min(1)
  durationMonths: number;

  @IsOptional()
  @IsEnum(LoanStatus)
  status?: LoanStatus;

  @IsString()
  repaymentSchedule: string;

  @IsOptional()
  nextDueDate?: Date;
}
