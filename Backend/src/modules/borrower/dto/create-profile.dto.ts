import {
  IsString,
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsNumber,
  IsEnum,
  IsDateString,
  ValidateNested,
  Min,
  MaxLength,
  Matches,
} from 'class-validator';
import { Type } from 'class-transformer';

/**
 * Validates borrower address details nested inside profile payloads.
 */
export class AddressDto {
  @IsString()
  @IsNotEmpty()
  line1!: string;

  @IsString()
  @IsOptional()
  line2?: string;

  @IsString()
  @IsNotEmpty()
  city!: string;

  @IsString()
  @IsNotEmpty()
  district!: string;

  @IsString()
  @IsNotEmpty()
  province!: string;
}



/**
 * Validates payloads for creating a borrower profile record.
 */
export class CreateBorrowerProfileDto {
  @IsString()
  @IsNotEmpty()
  userId!: string;

  @IsString()
  @IsNotEmpty()
  fullName!: string;

  @IsEmail()
  email!: string;

  @IsString()
  @Matches(/^\+94[0-9]{9}$/, {
    message: 'Phone must be in format +94XXXXXXXXX',
  })
  phone!: string;

  @IsDateString()
  dateOfBirth!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(12)
  nic!: string; // National Identity Card

  @ValidateNested()
  @Type(() => AddressDto)
  address!: AddressDto;

  @IsString()
  @IsNotEmpty()
  employmentStatus!: string;

  @IsNumber()
  @Min(0)
  monthlyIncome!: number; // LKR

  @IsString()
  @IsOptional()
  occupation?: string;
}
