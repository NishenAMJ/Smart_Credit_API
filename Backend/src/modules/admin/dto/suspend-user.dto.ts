import { IsString, IsNotEmpty, IsOptional } from 'class-validator';

export class SuspendUserDto {
  @IsString()
  @IsNotEmpty()
  userId: string;

  @IsString()
  @IsOptional()
  reason?: string;
}
