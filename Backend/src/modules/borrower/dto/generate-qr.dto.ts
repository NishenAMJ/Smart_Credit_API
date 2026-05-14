import { IsString, IsNumber, Min } from 'class-validator';

export class GenerateQrDto {
  @IsString()
  loanId: string;

  @IsNumber()
  @Min(0)
  amount: number;

  @IsString()
  borrowerId: string;
}
