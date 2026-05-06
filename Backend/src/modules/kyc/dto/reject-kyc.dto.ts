import { IsString, IsNotEmpty } from 'class-validator';

export class RejectKycDto {
  @IsString()
  @IsNotEmpty()
  reason: string;
}
