import {
  IsEmail,
  IsIn,
  IsNotEmpty,
  IsString,
  Matches,
  MinLength,
} from 'class-validator';

import { PUBLIC_USER_ROLES } from '../auth.types';

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
}
