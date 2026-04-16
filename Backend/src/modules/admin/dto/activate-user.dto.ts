import { IsString, IsNotEmpty } from 'class-validator';

export class ActivateUserDto {
  @IsString()
  @IsNotEmpty()
  // Identifies the suspended user record to reactivate.
  userId: string;
}
