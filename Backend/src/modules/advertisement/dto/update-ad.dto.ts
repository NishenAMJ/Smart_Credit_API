import {
  IsString,
  IsNumber,
  IsArray,
  IsOptional,
  IsEnum,
  Min,
  Max,
  IsPositive,
} from 'class-validator';
import { AdStatus } from '../interfaces/advertisement.interface';

export class UpdateAdDto {
  @IsString()
  @IsOptional()
  title?: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsString()
  @IsOptional()
  imageUrl?: string;

  @IsNumber()
  @IsPositive()
  @IsOptional()
  minAmount?: number;

  @IsNumber()
  @IsPositive()
  @IsOptional()
  maxAmount?: number;

  @IsNumber()
  @Min(1)
  @Max(50)
  @IsOptional()
  preferredInterestRate?: number;

  @IsNumber()
  @Min(1)
  @IsOptional()
  minTenureMonths?: number;

  @IsNumber()
  @Min(1)
  @IsOptional()
  maxTenureMonths?: number;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  preferredPurposes?: string[];

  @IsNumber()
  @IsPositive()
  @IsOptional()
  availableCapital?: number;

  @IsNumber()
  @Min(1)
  @IsOptional()
  responseTimeHours?: number;

  @IsString()
  @IsOptional()
  location?: string;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  searchKeywords?: string[];

  @IsEnum(['active', 'paused', 'expired', 'pending'])
  @IsOptional()
  status?: AdStatus;

  @IsString()
  @IsOptional()
  expiresAt?: string;
}