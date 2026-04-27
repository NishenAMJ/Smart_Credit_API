import type { SafeUserDto } from './auth-response.dto';
import type { UserRole } from '../auth.types';

export class SessionResponseDto {
  message!: string;
  activeRole!: UserRole;
  availableRoles!: UserRole[];
  accountStatus!: string;
  kycStatus!: string;
  user!: SafeUserDto;
}

