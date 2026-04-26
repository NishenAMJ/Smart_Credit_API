import {
  IsString,
  IsNumber,
  IsArray,
  IsNotEmpty,
  IsOptional,
  Min,
  Max,
  ArrayMinSize,
  IsPositive,
} from 'class-validator';

export class CreateAdDto {
  @IsString()
  @IsNotEmpty({ message: 'Title is required' })
  title: string;

  @IsString()
  @IsNotEmpty({ message: 'Description is required' })
  description: string;

  @IsString()
  @IsOptional()
  imageUrl?: string;

  @IsNumber()
  @IsPositive({ message: 'Minimum amount must be positive' })
  minAmount: number;

  @IsNumber()
  @IsPositive({ message: 'Maximum amount must be positive' })
  maxAmount: number;

  @IsNumber()
  @Min(1, { message: 'Interest rate must be at least 1%' })
  @Max(50, { message: 'Interest rate cannot exceed 50%' })
  preferredInterestRate: number;

  @IsNumber()
  @Min(1, { message: 'Minimum tenure must be at least 1 month' })
  minTenureMonths: number;

  @IsNumber()
  @Min(1, { message: 'Maximum tenure must be at least 1 month' })
  maxTenureMonths: number;

  @IsArray()
  @ArrayMinSize(1, { message: 'At least one purpose is required' })
  @IsString({ each: true })
  preferredPurposes: string[];

  @IsNumber()
  @IsPositive({ message: 'Available capital must be positive' })
  availableCapital: number;

  @IsNumber()
  @Min(1, { message: 'Response time must be at least 1 hour' })
  responseTimeHours: number;

  @IsString()
  @IsNotEmpty({ message: 'Location is required' })
  location: string;

  @IsArray()
  @IsOptional()
  @IsString({ each: true })
  searchKeywords?: string[];

  @IsString()
  @IsNotEmpty({ message: 'Expiry date is required' })
  expiresAt: string;
}