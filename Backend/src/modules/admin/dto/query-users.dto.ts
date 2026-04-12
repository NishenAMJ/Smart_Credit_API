import { IsIn, IsOptional, IsString } from 'class-validator';

export class QueryUsersDto {
  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsString()
  @IsIn(['admin', 'borrower', 'lender'])
  role?: string;

  @IsOptional()
  @IsString()
  @IsIn(['active', 'suspended', 'pending', 'inactive'])
  status?: string;
}
