import {
  Equals,
  IsEmail,
  IsIn,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  ValidateIf,
  MaxLength,
  MinLength,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

import { PUBLIC_USER_ROLES } from '../auth.types';

export class RegistrationAddressDto {
  @IsString()
  @IsNotEmpty({ message: 'Street address is required.' })
  @MaxLength(160)
  line1!: string;

  @IsString()
  @IsOptional()
  @MaxLength(160)
  line2?: string;

  @IsString()
  @IsNotEmpty({ message: 'City is required.' })
  @MaxLength(80)
  city!: string;

  @IsString()
  @IsNotEmpty({ message: 'District is required.' })
  @MaxLength(80)
  district!: string;

  @IsString()
  @IsNotEmpty({ message: 'Province is required.' })
  @MaxLength(80)
  province!: string;
}

export class RegisterDto {
  @IsString()
  @IsNotEmpty({ message: 'Full name is required.' })
  fullName!: string;

  @IsEmail({}, { message: 'Please provide a valid email address.' })
  @IsNotEmpty({ message: 'Email is required.' })
  email!: string;

  @IsString()
  @IsNotEmpty({ message: 'Phone is required.' })
  @Matches(/^[0-9+\-\s()]{9,20}$/, {
    message: 'Please provide a valid phone number.',
  })
  phone!: string;

  @ValidateNested()
  @Type(() => RegistrationAddressDto)
  address!: RegistrationAddressDto;

  @IsString()
  @IsNotEmpty({ message: 'Password is required.' })
  @MinLength(8, {
    message: 'Password must be at least 8 characters long.',
  })
  password!: string;

  @IsString()
  @IsIn(PUBLIC_USER_ROLES, {
    message: 'Role must be either borrower or lender.',
  })
  role!: (typeof PUBLIC_USER_ROLES)[number];

  @ValidateIf((dto: RegisterDto) => dto.role === 'borrower')
  @Equals(true, { message: 'You must accept the registration terms.' })
  acceptedTerms?: boolean;

  @ValidateIf((dto: RegisterDto) => dto.role === 'borrower')
  @IsString()
  @IsIn(['registration_terms_v1'])
  termsVersion?: 'registration_terms_v1';
}
