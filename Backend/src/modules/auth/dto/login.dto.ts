import { IsIn, IsNotEmpty, IsString } from 'class-validator';

import { USER_ROLES } from '../auth.types';

export class LoginDto {
  @IsString()
  @IsNotEmpty({ message: 'Email or phone is required.' })
  identifier!: string;

  @IsString()
  @IsNotEmpty({ message: 'Password is required.' })
  password!: string;

  @IsString()
  @IsIn(USER_ROLES, {
    message: 'Role must be borrower, lender, or admin.',
  })
  role!: (typeof USER_ROLES)[number];
}

