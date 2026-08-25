import {
  IsDateString,
  IsEmail,
  IsIn,
  IsOptional,
  IsString,
  Matches,
} from 'class-validator';
import { Transform } from 'class-transformer';

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
  @Transform(({ value }) =>
    typeof value === 'string' ? value.replace(/[\s()-]/g, '') : value,
  )
  @Matches(/^(?:\+94|94|0)?7[01245678]\d{7}$/, {
    message: 'Please provide a valid Sri Lankan mobile number.',
  })
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
