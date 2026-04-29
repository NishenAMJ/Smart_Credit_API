import { IsIn, IsOptional, IsString, Length } from 'class-validator';

export class VerifyOtpDto {
  @IsString()
  @Length(6, 6)
  otpCode: string;

  @IsString()
  @IsOptional()
  otpSessionId?: string;

  @IsString()
  @IsIn(['login', 'register'])
  purpose: 'login' | 'register';
}
