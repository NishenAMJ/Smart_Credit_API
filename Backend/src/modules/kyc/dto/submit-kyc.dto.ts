import {
  IsDateString,
  IsEmail,
  IsIn,
  IsOptional,
  IsString,
  IsNotEmpty,
  MaxLength,
  Matches,
} from 'class-validator';

export class SubmitKycDto {
  @IsOptional()
  @IsString()
  @IsIn(['borrower', 'lender'])
  role?: 'borrower' | 'lender';

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  fullName?: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsString()
  @Matches(/^\+?[0-9()\-\s]{9,20}$/)
  phoneNumber?: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  nic?: string;

  @IsOptional()
  @IsString()
  @IsIn(['national_id', 'passport', 'driving_license'])
  documentType?: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(30)
  documentNumber?: string;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  issuingCountry?: string;

  @IsOptional()
  @IsDateString()
  expiryDate?: string;

  @IsOptional()
  @IsDateString()
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
