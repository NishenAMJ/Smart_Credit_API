import {
  IsString,
  IsOptional,
  IsNumber,
  IsEnum,
  ValidateNested,
  Min,
  MinLength,
  Matches,
} from 'class-validator';
import { Type } from 'class-transformer';
import { AddressDto } from './create-profile.dto';

/**
 * Validates partial borrower profile updates.
 */
export class UpdateBorrowerProfileDto {
  @IsString()
  @IsOptional()
  fullName?: string;

  @IsString()
  @IsOptional()
  email?: string;

  @IsString()
  @MinLength(6)
  @IsOptional()
  password?: string;

  @IsString()
  @IsOptional()
  @Matches(/^\+94[0-9]{9}$/, {
    message: 'Phone must be in format +94XXXXXXXXX',
  })
  phone?: string;

  @ValidateNested()
  @Type(() => AddressDto)
  @IsOptional()
  address?: AddressDto;

  @IsString()
  @IsOptional()
  employmentStatus?: string;

  @IsNumber()
  @Min(0)
  @IsOptional()
  monthlyIncome?: number;

  @IsString()
  @IsOptional()
  occupation?: string;
}
