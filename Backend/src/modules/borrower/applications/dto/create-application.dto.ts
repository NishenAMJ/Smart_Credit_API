import { IsString, IsNumber, IsOptional, Min } from 'class-validator';

export class CreateApplicationDto {
  @IsString()
  adId!: string;

  @IsString()
  borrowerId!: string;

  @IsNumber()
  @Min(0)
  amount?: number;

  @IsString()
  purpose!: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  employmentStatus?: string;

  @IsOptional()
  @IsNumber()
  monthlyIncome?: number;
}
