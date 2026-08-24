import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsIn,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';

export class LenderNotificationSettingsDto {
  @IsOptional() @IsBoolean() inAppNewRequests?: boolean;
  @IsOptional() @IsBoolean() emailNewRequests?: boolean;
  @IsOptional() @IsBoolean() inAppTransactions?: boolean;
  @IsOptional() @IsBoolean() emailTransactions?: boolean;
  @IsOptional() @IsBoolean() inAppStatusUpdates?: boolean;
  @IsOptional() @IsBoolean() emailStatusUpdates?: boolean;
  @IsOptional() @IsBoolean() inAppOverdues?: boolean;
  @IsOptional() @IsBoolean() emailOverdues?: boolean;
  @IsOptional() @IsBoolean() inAppAdExpiry?: boolean;
  @IsOptional() @IsBoolean() emailAdExpiry?: boolean;
  @IsOptional() @IsBoolean() inAppDisputes?: boolean;
  @IsOptional() @IsBoolean() emailDisputes?: boolean;
}

export class LenderDefaultsDto {
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  @Max(100)
  defaultInterestRate?: number;
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(3)
  @Max(60)
  defaultMaxTenureMonths?: number;
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(10_000)
  @Max(5_000_000)
  defaultMinAmount?: number;
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(10_000)
  @Max(5_000_000)
  defaultMaxAmount?: number;
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(20)
  @IsString({ each: true })
  @MaxLength(80, { each: true })
  preferredPurposes?: string[];
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(10)
  @IsString({ each: true })
  @MaxLength(80, { each: true })
  preferredRegions?: string[];
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(72)
  defaultResponseTimeHours?: number;
}

export class LenderWorkspaceDto {
  @IsOptional() @IsIn(['dashboard', 'analytics']) defaultLandingPage?:
    | 'dashboard'
    | 'analytics';
  @IsOptional() @IsIn(['30d', '90d', '365d']) defaultAnalyticsRange?:
    | '30d'
    | '90d'
    | '365d';
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  pendingRequestsPageSize?: number;
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  borrowerTablePageSize?: number;
}

export class UpdateLenderSettingsDto {
  @IsOptional()
  @ValidateNested()
  @Type(() => LenderNotificationSettingsDto)
  notifications?: LenderNotificationSettingsDto;
  @IsOptional()
  @ValidateNested()
  @Type(() => LenderDefaultsDto)
  lendingDefaults?: LenderDefaultsDto;
  @IsOptional()
  @ValidateNested()
  @Type(() => LenderWorkspaceDto)
  workspace?: LenderWorkspaceDto;
}
