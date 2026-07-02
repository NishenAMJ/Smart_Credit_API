import { IsNumber, IsOptional, IsString, Min } from 'class-validator';

export class GenerateQrDto {
  @IsString()
  loanId!: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  amount?: number;

  @IsOptional()
  @IsString()
  borrowerId?: string;
}
