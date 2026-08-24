import { IsIn, IsNotEmpty, IsString, MaxLength } from 'class-validator';
import type { AdBoostPaymentMethod } from './ad-boosts.types';

export class CreateAdBoostDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(160)
  listingId!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(80)
  planId!: string;

  @IsIn(['bank_transfer', 'card'])
  paymentMethod!: AdBoostPaymentMethod;
}

export class SubmitAdBoostReceiptDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(160)
  receiptDocumentId!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  bankReference!: string;
}
