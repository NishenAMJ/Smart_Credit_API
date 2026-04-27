import type { KycStatus, UserRole } from '../auth.types';

export class SafeUserDto {
  uid!: string;
  fullName!: string;
  email!: string;
  phone!: string;
  role!: UserRole;
  kycStatus!: KycStatus;
}

export class RegisterResponseDto {
  message!: string;
  user!: SafeUserDto;
}

export class AuthResponseDto {
  accessToken!: string;
  user!: SafeUserDto;
}

export class MeResponseDto {
  user!: SafeUserDto;
}

