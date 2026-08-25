import {
  IsEmail,
  IsIn,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  MinLength,
  ValidateNested,
} from 'class-validator';
import { Transform, Type } from 'class-transformer';

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
  @MinLength(3)
  @MaxLength(120)
  fullName!: string;

  @IsEmail(
    { allow_utf8_local_part: false, require_tld: true },
    { message: 'Please provide a valid email address.' },
  )
  @IsNotEmpty({ message: 'Email is required.' })
  @MaxLength(254, { message: 'Email address is too long.' })
  email!: string;

  @IsString()
  @IsNotEmpty({ message: 'Phone is required.' })
  @Transform(({ value }) =>
    typeof value === 'string' ? value.replace(/[\s()-]/g, '') : value,
  )
  @Matches(/^(?:\+94|94|0)?7[01245678]\d{7}$/, {
    message: 'Please provide a valid Sri Lankan mobile number.',
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
  @MaxLength(128)
  password!: string;

  @IsString()
  @IsIn(PUBLIC_USER_ROLES, {
    message: 'Role must be either borrower or lender.',
  })
  role!: (typeof PUBLIC_USER_ROLES)[number];
}
