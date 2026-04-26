import {
  IsNumber,
  IsString,
  IsNotEmpty,
  IsPositive,
  IsEnum,
} from 'class-validator';

// Boost packages available
export type BoostPackage = '7days' | '14days' | '30days';

export class BoostAdDto {
  @IsEnum(['7days', '14days', '30days'], {
    message: 'Package must be 7days, 14days or 30days',
  })
  package: BoostPackage;

  @IsNumber()
  @IsPositive({ message: 'Amount must be positive' })
  amount: number;

  @IsString()
  @IsNotEmpty({ message: 'Payment reference is required' })
  paymentReference: string;
}