import { IsNumber, IsOptional, IsPositive, IsString } from 'class-validator';

export class InitiatePayHereDto {
  @IsString()
  loanId!: string;

  @IsNumber({ allowInfinity: false, allowNaN: false, maxDecimalPlaces: 2 })
  @IsPositive()
  amount!: number;

  @IsOptional()
  @IsString()
  borrowerId?: string;
}
