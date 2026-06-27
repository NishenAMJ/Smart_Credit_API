import { IsString, IsOptional } from 'class-validator';

export class ResolveDisputeDto {
  @IsString()
  resolution: string;

  @IsString()
  @IsOptional()
  notes?: string;
}
