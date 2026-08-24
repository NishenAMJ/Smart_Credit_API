import {
  IsIn,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

import { USER_ROLES } from '../auth.types';

export class LoginDto {
  @IsString()
  @IsNotEmpty({ message: 'Email or phone is required.' })
  @MaxLength(254)
  identifier!: string;

  @IsString()
  @IsNotEmpty({ message: 'Password is required.' })
  @MaxLength(128)
  password!: string;

  @IsOptional()
  @IsString()
  @IsIn(USER_ROLES, {
    message: 'Role must be borrower, lender, or admin.',
  })
  role?: (typeof USER_ROLES)[number];
}
