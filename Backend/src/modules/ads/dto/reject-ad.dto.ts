import { IsString, IsNotEmpty } from 'class-validator';

export class RejectAdDto {
  @IsString()
  @IsNotEmpty()
  reason: string;
}
