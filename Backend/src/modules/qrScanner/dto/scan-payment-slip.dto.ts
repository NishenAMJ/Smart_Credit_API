import { IsString, IsNotEmpty, IsOptional, IsNumber } from 'class-validator';

export class ScanPaymentSlipDto {
  /**
   * QR code data from payment slip
   * Format: typically contains loan ID, borrower ID, and amount
   */
  @IsString()
  @IsNotEmpty()
  qrData: string;

  /**
   * Loan ID extracted or confirmed from QR data
   */
  @IsString()
  @IsNotEmpty()
  loanId: string;

  /**
   * Borrower ID making the payment
   */
  @IsString()
  @IsNotEmpty()
  borrowerId: string;

  /**
   * Payment amount from the slip
   */
  @IsNumber()
  @IsNotEmpty()
  amount: number;

  /**
   * Optional reference number from payment slip
   */
  @IsString()
  @IsOptional()
  referenceNumber?: string;

  /**
   * Optional payment method identifier
   */
  @IsString()
  @IsOptional()
  paymentMethod?: string;
}
