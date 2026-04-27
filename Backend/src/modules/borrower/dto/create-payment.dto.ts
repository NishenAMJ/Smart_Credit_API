import { IsString, IsNumber, IsEnum, IsOptional, Min } from 'class-validator';

export enum PaymentMethod {
  BANK_TRANSFER = 'BANK_TRANSFER',
  QR_CODE = 'QR_CODE',
  CARD = 'CARD',
  CASH = 'CASH',
}

export class CreatePaymentDto {
  @IsString()
  loanId: string;

  @IsString()
  borrowerId: string;

  @IsNumber()
  @Min(0)
  amount: number;

  @IsEnum(PaymentMethod)
  paymentMethod: PaymentMethod;

  @IsOptional()
  @IsString()
  transactionReference?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}
