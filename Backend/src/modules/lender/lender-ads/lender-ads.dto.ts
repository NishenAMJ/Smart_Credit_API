import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsIn,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

export class CreateLenderAdDto {
  @IsString()
  @MinLength(12)
  @MaxLength(160)
  headline!: string;

  @Type(() => Number)
  @IsNumber({ allowInfinity: false, allowNaN: false, maxDecimalPlaces: 2 })
  @Min(10_000)
  @Max(5_000_000)
  minAmount!: number;

  @Type(() => Number)
  @IsNumber({ allowInfinity: false, allowNaN: false, maxDecimalPlaces: 2 })
  @Min(10_000)
  @Max(5_000_000)
  maxAmount!: number;

  @Type(() => Number)
  @IsNumber({ allowInfinity: false, allowNaN: false, maxDecimalPlaces: 2 })
  @Min(0.01)
  @Max(100)
  interestRate!: number;

  @Type(() => Number)
  @IsOptional()
  @IsInt()
  @Min(3)
  @Max(60)
  minTenureMonths?: number;

  @Type(() => Number)
  @IsInt()
  @Min(3)
  @Max(60)
  tenureMonths!: number;

  @IsString()
  @MinLength(8)
  @MaxLength(240)
  borrowerFocus!: string;

  @IsString()
  @MinLength(6)
  @MaxLength(100)
  processingTime!: string;

  @Type(() => Number)
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(168)
  responseTimeHours?: number;

  @IsString()
  @MinLength(6)
  @MaxLength(100)
  repaymentStyle!: string;

  @IsString()
  @MinLength(12)
  @MaxLength(1000)
  requirements!: string;

  @IsString()
  @MinLength(12)
  @MaxLength(2000)
  supportNote!: string;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(4)
  @IsString({ each: true })
  @MaxLength(80, { each: true })
  preferredPurposes?: string[];
}

export class UpdateLenderAdDto extends CreateLenderAdDto {
  @IsOptional()
  declare headline: string;

  @IsOptional()
  declare minAmount: number;

  @IsOptional()
  declare maxAmount: number;

  @IsOptional()
  declare interestRate: number;

  @IsOptional()
  declare tenureMonths: number;

  @IsOptional()
  declare borrowerFocus: string;

  @IsOptional()
  declare processingTime: string;

  @IsOptional()
  declare repaymentStyle: string;

  @IsOptional()
  declare requirements: string;

  @IsOptional()
  declare supportNote: string;

  @IsOptional()
  @IsIn(['paused', 'active'])
  status?: 'paused' | 'active';
}
