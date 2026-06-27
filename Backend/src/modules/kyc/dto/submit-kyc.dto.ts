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

  @IsString()
  @IsNotEmpty()
  nicFrontDocumentId: string;

  @IsString()
  @IsNotEmpty()
  nicBackDocumentId: string;

  @IsString()
  @IsNotEmpty()
  addressProofNumber: string;

  @IsString()
  @IsNotEmpty()
  addressProofDocumentId: string;

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
  bankDocumentId: string;

  @IsString()
  @IsNotEmpty()
  profilePhotoUrl: string; // This should now be the final secure URL or an asset ID

  @IsOptional()
  userId?: string;
}
