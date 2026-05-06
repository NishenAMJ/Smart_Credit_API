import {
  IsEmail,
  IsNotEmpty,
  IsIn,
  IsOptional,
  IsString,
} from 'class-validator';

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

  @IsOptional()
  @IsString()
  nicFrontDataUrl?: string;

  @IsOptional()
  @IsString()
  nicBackDataUrl?: string;

  @IsOptional()
  @IsString()
  documentFrontUrl?: string;

  @IsOptional()
  @IsString()
  documentBackUrl?: string;

  @IsOptional()
  @IsString()
  addressProofNumber?: string;

  @IsOptional()
  @IsString()
  addressProofDataUrl?: string;

  @IsOptional()
  @IsString()
  bankAccountNumber?: string;

  @IsOptional()
  @IsString()
  bankName?: string;

  @IsOptional()
  @IsString()
  branchCode?: string;

  @IsOptional()
  @IsString()
  accountType?: string;

  @IsOptional()
  @IsString()
  bankDocumentDataUrl?: string;

  @IsOptional()
  @IsString()
  profilePhotoUrl?: string;

  @IsOptional()
  @IsString()
  profilePictureUrl?: string;

  @IsOptional()
  @IsString()
  selfieUrl?: string;

  @IsOptional()
  userId?: string;
}
