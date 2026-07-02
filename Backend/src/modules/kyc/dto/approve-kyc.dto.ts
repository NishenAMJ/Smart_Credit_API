import { IsOptional, IsString } from 'class-validator';

export class ApproveKycDto {
  @IsString()
  @IsOptional()
  notes?: string;
}
