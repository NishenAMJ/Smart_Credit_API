import { IsString, IsNotEmpty, IsOptional } from 'class-validator';

export class ApproveKycDto {
  @IsString()
  @IsOptional()
  notes?: string;
}
