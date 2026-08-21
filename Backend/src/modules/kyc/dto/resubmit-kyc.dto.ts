import { IsOptional, IsString } from 'class-validator';

export class ResubmitKycDto {
  @IsOptional()
  @IsString()
  documentFrontUrl?: string;

  @IsOptional()
  @IsString()
  documentBackUrl?: string;

  @IsOptional()
  @IsString()
  selfieUrl?: string;
}
