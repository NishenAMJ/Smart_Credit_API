import { Body, Controller, Get, Patch, Req, UseGuards } from '@nestjs/common';
import type { AuthenticatedRequest } from '../../../common/types/authenticated-request';
import { Roles } from '../../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { LenderSettingsService } from './lender-settings.service';
import {
  AnalyticsRangeKey,
  LenderLandingPage,
  LenderSettingsLendingDefaults,
  LenderSettingsNotifications,
  LenderSettingsResponse,
  LenderSettingsWorkspace,
  UpdateLenderSettingsInput,
} from './lender-settings.types';

type UpdateLenderSettingsBody = {
  notifications?: Partial<Record<keyof LenderSettingsNotifications, unknown>>;
  lendingDefaults?: Partial<Record<keyof LenderSettingsLendingDefaults, unknown>>;
  workspace?: Partial<Record<keyof LenderSettingsWorkspace, unknown>>;
};

@Controller('lender-settings')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('lender')
export class LenderSettingsController {
  constructor(private readonly lenderSettingsService: LenderSettingsService) {}

  @Get('me')
  getSettings(@Req() req: AuthenticatedRequest): Promise<LenderSettingsResponse> {
    return this.lenderSettingsService.getSettings(req.user.sub);
  }

  @Patch('me')
  updateSettings(
    @Req() req: AuthenticatedRequest,
    @Body() body: UpdateLenderSettingsBody,
  ): Promise<LenderSettingsResponse> {
    return this.lenderSettingsService.updateSettings(
      req.user.sub,
      this.toUpdateInput(body),
    );
  }

  private toUpdateInput(body: UpdateLenderSettingsBody): UpdateLenderSettingsInput {
    return {
      notifications: body.notifications
        ? {
            inAppNewRequests: this.toOptionalBoolean(
              body.notifications.inAppNewRequests,
            ),
            emailNewRequests: this.toOptionalBoolean(
              body.notifications.emailNewRequests,
            ),
            inAppTransactions: this.toOptionalBoolean(
              body.notifications.inAppTransactions,
            ),
            emailTransactions: this.toOptionalBoolean(
              body.notifications.emailTransactions,
            ),
            inAppStatusUpdates: this.toOptionalBoolean(
              body.notifications.inAppStatusUpdates,
            ),
            emailStatusUpdates: this.toOptionalBoolean(
              body.notifications.emailStatusUpdates,
            ),
            inAppOverdues: this.toOptionalBoolean(
              body.notifications.inAppOverdues,
            ),
            emailOverdues: this.toOptionalBoolean(
              body.notifications.emailOverdues,
            ),
            inAppAdExpiry: this.toOptionalBoolean(
              body.notifications.inAppAdExpiry,
            ),
            emailAdExpiry: this.toOptionalBoolean(
              body.notifications.emailAdExpiry,
            ),
            inAppDisputes: this.toOptionalBoolean(
              body.notifications.inAppDisputes,
            ),
            emailDisputes: this.toOptionalBoolean(
              body.notifications.emailDisputes,
            ),
          }
        : undefined,
      lendingDefaults: body.lendingDefaults
        ? {
            defaultInterestRate: this.toOptionalNumber(
              body.lendingDefaults.defaultInterestRate,
            ),
            defaultMaxTenureMonths: this.toOptionalNumber(
              body.lendingDefaults.defaultMaxTenureMonths,
            ),
            defaultMinAmount: this.toOptionalNumber(
              body.lendingDefaults.defaultMinAmount,
            ),
            defaultMaxAmount: this.toOptionalNumber(
              body.lendingDefaults.defaultMaxAmount,
            ),
            preferredPurposes: this.toOptionalStringArray(
              body.lendingDefaults.preferredPurposes,
            ),
            preferredRegions: this.toOptionalStringArray(
              body.lendingDefaults.preferredRegions,
            ),
            defaultResponseTimeHours: this.toOptionalNumber(
              body.lendingDefaults.defaultResponseTimeHours,
            ),
          }
        : undefined,
      workspace: body.workspace
        ? {
            defaultLandingPage: this.toOptionalLandingPage(
              body.workspace.defaultLandingPage,
            ),
            defaultAnalyticsRange: this.toOptionalAnalyticsRange(
              body.workspace.defaultAnalyticsRange,
            ),
            pendingRequestsPageSize: this.toOptionalNumber(
              body.workspace.pendingRequestsPageSize,
            ),
            borrowerTablePageSize: this.toOptionalNumber(
              body.workspace.borrowerTablePageSize,
            ),
          }
        : undefined,
    };
  }

  private toOptionalBoolean(value: unknown): boolean | undefined {
    if (typeof value === 'boolean') {
      return value;
    }

    if (typeof value === 'string') {
      if (value === 'true') {
        return true;
      }

      if (value === 'false') {
        return false;
      }
    }

    return undefined;
  }

  private toOptionalNumber(value: unknown): number | undefined {
    if (typeof value === 'number' && Number.isFinite(value)) {
      return value;
    }

    if (typeof value === 'string' && value.trim().length > 0) {
      const parsed = Number(value);
      if (Number.isFinite(parsed)) {
        return parsed;
      }
    }

    return undefined;
  }

  private toOptionalStringArray(value: unknown): string[] | undefined {
    if (Array.isArray(value)) {
      return value.filter((entry): entry is string => typeof entry === 'string');
    }

    if (typeof value === 'string') {
      return value
        .split(',')
        .map((entry) => entry.trim())
        .filter((entry) => entry.length > 0);
    }

    return undefined;
  }

  private toOptionalLandingPage(
    value: unknown,
  ): LenderLandingPage | undefined {
    return value === 'dashboard' || value === 'analytics'
      ? value
      : undefined;
  }

  private toOptionalAnalyticsRange(
    value: unknown,
  ): AnalyticsRangeKey | undefined {
    return value === '30d' || value === '90d' || value === '365d'
      ? value
      : undefined;
  }
}
