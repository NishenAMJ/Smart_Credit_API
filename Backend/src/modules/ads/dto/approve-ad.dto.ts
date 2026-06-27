import { IsString, IsOptional } from 'class-validator';

export class ApproveAdDto {
  @IsString()
  @IsOptional()
  notes?: string;
}
