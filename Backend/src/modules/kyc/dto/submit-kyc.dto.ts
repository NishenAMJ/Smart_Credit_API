import {
  IsDateString,
  IsEmail,
  IsIn,
  IsOptional,
  IsString,
} from 'class-validator';

export class SubmitKycDto {
  @IsOptional()
  @IsString()
  @IsIn(['borrower', 'lender'])
  role?: 'borrower' | 'lender';

  @IsOptional()
  @IsString()
  fullName?: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsString()
  phoneNumber?: string;

  @IsOptional()
  @IsString()
  nic?: string;

  @IsOptional()
  @IsString()
  documentType?: string;

  @IsOptional()
  @IsString()
  documentNumber?: string;

  @IsOptional()
  @IsString()
  issuingCountry?: string;

  @IsOptional()
  @IsDateString()
  expiryDate?: string;

  @IsOptional()
  @IsString()
  birthDate?: string;

  // Accepted only for backwards-compatible validation. Authentication owns
  // password hashes and the KYC service deliberately ignores this field.
  @IsOptional()
  @IsString()
  passwordHash?: string;

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
