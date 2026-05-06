import { IsIn, IsOptional, IsString } from 'class-validator';
import type { UserRole, UserStatus } from '../interfaces/user.interface';

export class QueryUsersDto {
  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsString()
  @IsIn(['admin', 'borrower', 'lender'])
  role?: UserRole;

  @IsOptional()
  @IsString()
  @IsIn(['active', 'suspended', 'pending'])
  status?: UserStatus;

  @IsOptional()
  @IsString()
  limit?: string;

  @IsOptional()
  @IsString()
  cursor?: string;
}
