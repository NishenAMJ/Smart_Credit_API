import { IsString, IsNotEmpty, IsOptional } from 'class-validator';

export class SuspendUserDto {
  @IsString()
  @IsNotEmpty()
  // Identifies the user record to suspend.
  userId: string;

  @IsString()
  @IsOptional()
  // Captures the admin's reason for the suspension decision.
  reason?: string;
}
