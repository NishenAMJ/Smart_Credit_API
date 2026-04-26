import { IsEmail, IsNotEmpty, IsString, MinLength } from 'class-validator';

export class AdminSignupDto {
  @IsString()
  @IsNotEmpty()
  firstName: string;

  @IsString()
  @IsNotEmpty()
  lastName: string;

  @IsEmail()
  @IsNotEmpty()
  email: string;

  @IsString()
  @IsNotEmpty()
  phone: string;

  @IsString()
  @IsNotEmpty()
  department: string;

  @IsString()
  @IsNotEmpty()
  adminRole: string;

  @IsString()
  @MinLength(8)
  password: string;
}
