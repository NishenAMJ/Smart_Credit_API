import type { SafeUserDto } from './auth-response.dto';
import type { UserRole } from '../auth.types';

export class DashboardMetricDto {
  label!: string;
  value!: string;
  helper!: string;
}

export class DashboardListItemDto {
  id!: string;
  title!: string;
  subtitle!: string;
  meta!: string;
  status!: string;
}

export class DashboardResponseDto {
  user!: SafeUserDto;
  role!: UserRole;
  headline!: string;
  summary!: string;
  metrics!: DashboardMetricDto[];
  primaryListTitle!: string;
  primaryList!: DashboardListItemDto[];
  secondaryListTitle!: string;
  secondaryList!: DashboardListItemDto[];
}
