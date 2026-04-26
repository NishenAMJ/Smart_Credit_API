import { IsEmail, IsNotEmpty, IsIn, IsOptional, IsString } from 'class-validator';

export class SubmitKycDto {
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
  @IsNotEmpty()
  passwordHash: string;

  @IsString()
  @IsNotEmpty()
  nicFrontUrl: string;

  @IsString()
  @IsNotEmpty()
  nicBackUrl: string;

  @IsString()
  @IsNotEmpty()
  addressProofNumber: string;

  @IsString()
  @IsNotEmpty()
  addressProofUrl: string;

  @IsString()
  @IsNotEmpty()
  bankAccountNumber: string;

  @IsString()
  @IsNotEmpty()
  bankName: string;

  @IsString()
  @IsNotEmpty()
  branchCode: string;

  @IsString()
  @IsNotEmpty()
  accountType: string;

  @IsString()
  @IsNotEmpty()
  bankDocumentUrl: string;

  @IsString()
  @IsNotEmpty()
  profilePhotoUrl: string;

  @IsOptional()
  userId?: string;
}
