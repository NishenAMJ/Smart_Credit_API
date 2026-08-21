import { IsString, IsOptional, IsNotEmpty, MaxLength } from 'class-validator';

export class ResolveDisputeDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(2000)
  resolution!: string;

  @IsString()
  @IsOptional()
  @MaxLength(2000)
  notes?: string;
}
