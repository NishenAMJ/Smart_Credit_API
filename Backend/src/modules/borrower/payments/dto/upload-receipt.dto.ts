import { IsString, IsOptional } from 'class-validator';

export class UploadReceiptDto {
  @IsString()
  paymentId: string;

  @IsString()
  receiptUrl: string;

  @IsOptional()
  @IsString()
  notes?: string;
}
