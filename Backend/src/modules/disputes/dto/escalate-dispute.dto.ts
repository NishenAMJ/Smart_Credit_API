import { IsString, IsOptional, IsNotEmpty, MaxLength } from 'class-validator';

export class EscalateDisputeDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(1000)
  reason!: string;

  @IsString()
  @IsOptional()
  @MaxLength(2000)
  notes?: string;
}
