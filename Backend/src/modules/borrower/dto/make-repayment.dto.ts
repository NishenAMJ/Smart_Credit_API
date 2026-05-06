import {
  IsString,
  IsNotEmpty,
  IsNumber,
  IsEnum,
  IsOptional,
  Min,
} from 'class-validator';
import { RepaymentMethod } from './loan-application.dto';

/**
 * Validates borrower repayment submission payloads.
 */
export class MakeRepaymentDto {
  @IsString()
  @IsNotEmpty()
  loanId!: string;

  @IsString()
  @IsNotEmpty()
  borrowerId!: string;

  @IsNumber()
  @Min(1)
  amount!: number; // LKR

  @IsEnum(RepaymentMethod)
  paymentMethod!: RepaymentMethod;

  @IsString()
  @IsOptional()
  transactionReference?: string;

  @IsString()
  @IsOptional()
  paymentProofUrl?: string; // Firebase Storage URL
}
