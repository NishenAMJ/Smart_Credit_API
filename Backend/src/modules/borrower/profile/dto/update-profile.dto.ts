import {
  IsString,
  IsOptional,
  IsNumber,
  IsEnum,
  IsEmail,
  ValidateNested,
  Min,
  MinLength,
  MaxLength,
  IsNotEmpty,
  Matches,
} from 'class-validator';
import { Type } from 'class-transformer';
import { AddressDto } from './create-profile.dto';

/**
 * Validates partial borrower profile updates.
 */
export class UpdateBorrowerProfileDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  @IsOptional()
  fullName?: string;

  @IsEmail()
  @IsOptional()
  email?: string;

  @IsString()
  @MinLength(8)
  @IsOptional()
  password?: string;

  @IsString()
  @IsOptional()
  currentPassword?: string;

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
  @IsNotEmpty()
  @MaxLength(80)
  @IsOptional()
  employmentStatus?: string;

  @IsNumber({ allowInfinity: false, allowNaN: false, maxDecimalPlaces: 2 })
  @Min(0)
  @IsOptional()
  monthlyIncome?: number;

  @IsString()
  @MaxLength(120)
  @IsOptional()
  occupation?: string;
}
