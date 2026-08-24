import { IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

export class ResubmitKycDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(14_000_000)
  documentFrontUrl!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(14_000_000)
  documentBackUrl!: string;

  @IsOptional()
  @IsString()
  @MaxLength(14_000_000)
  selfieUrl?: string;
}
