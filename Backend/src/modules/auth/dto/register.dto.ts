import {
  IsEmail,
  IsIn,
  IsNotEmpty,
  IsString,
  MinLength,
} from 'class-validator';

export class RegisterDto {
  @IsString()
  @IsIn(['borrower', 'lender'])
  role: 'borrower' | 'lender';

  @IsString()
  @IsNotEmpty()
  fullName: string;

  @IsEmail()
  email: string;

  @IsString()
  @IsNotEmpty()
  phoneNumber: string;

  @IsString()
  @IsNotEmpty()
  nic: string;

  @IsString()
  @IsNotEmpty()
  birthDate: string;

  @IsString()
  @MinLength(6)
  password: string;
}
