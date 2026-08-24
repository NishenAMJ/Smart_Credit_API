import { Type } from 'class-transformer';
import {
  IsDateString,
  IsIn,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  ValidateIf,
} from 'class-validator';

export class RecordInstallmentPaymentDto {
  @Type(() => Number)
  @IsNumber({ allowInfinity: false, allowNaN: false, maxDecimalPlaces: 2 })
  @Min(0.01)
  amount!: number;

  @IsOptional()
  @IsDateString({ strict: true })
  paidAt?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  note?: string | null;

  @IsOptional()
  @IsIn(['bank_transfer', 'qr', 'cash', 'card'])
  paymentMethod?: 'bank_transfer' | 'qr' | 'cash' | 'card';
}

export class ReceiptVerificationDecisionDto {
  @IsIn(['approve', 'reject'])
  decision!: 'approve' | 'reject';

  @ValidateIf((input) => input.decision === 'reject')
  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  note?: string | null;
}
