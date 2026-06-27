import { IsString, IsOptional } from 'class-validator';

export class EscalateDisputeDto {
  @IsString()
  reason: string;

  @IsString()
  @IsOptional()
  notes?: string;
}
