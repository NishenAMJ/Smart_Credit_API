import {
  IsString,
  IsNotEmpty,
  IsNumber,
  IsEnum,
  IsOptional,
  Min,
} from 'class-validator';
import { RepaymentMethod } from '../../applications/dto/loan-application.dto';

/**
 * Validates borrower repayment submission payloads.
 */
export class MakeRepaymentDto {
  @IsString()
  @IsNotEmpty()
  loanId!: string;

  @IsString()
  @IsOptional()
  borrowerId!: string;

  @IsNumber({ allowInfinity: false, allowNaN: false, maxDecimalPlaces: 2 })
  @Min(1)
  amount!: number; // LKR

  @IsOptional()
  @IsEnum(RepaymentMethod)
  paymentMethod!: RepaymentMethod;

  @IsString()
  @IsOptional()
  transactionReference?: string;

  @IsString()
  @IsOptional()
  paymentProofUrl?: string; // Firebase Storage URL

  @IsString()
  @IsOptional()
  receiptDocumentId?: string;
}
