import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  Patch,
} from '@nestjs/common';
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
  lendingDefaults?: Partial<
    Record<keyof LenderSettingsLendingDefaults, unknown>
  >;
  workspace?: Partial<Record<keyof LenderSettingsWorkspace, unknown>>;
};

@Controller('lender-settings')
export class LenderSettingsController {
  constructor(private readonly lenderSettingsService: LenderSettingsService) {}

  @Get(':lenderId')
  getSettings(
    @Param('lenderId') lenderId: string,
  ): Promise<LenderSettingsResponse> {
    if (!lenderId.trim()) {
      throw new BadRequestException('lenderId is required.');
    }

    return this.lenderSettingsService.getSettings(lenderId.trim());
  }

  @Patch(':lenderId')
  updateSettings(
    @Param('lenderId') lenderId: string,
    @Body() body: UpdateLenderSettingsBody,
  ): Promise<LenderSettingsResponse> {
    if (!lenderId.trim()) {
      throw new BadRequestException('lenderId is required.');
    }

    return this.lenderSettingsService.updateSettings(
      lenderId.trim(),
      this.toUpdateInput(body),
    );
  }

  private toUpdateInput(
    body: UpdateLenderSettingsBody,
  ): UpdateLenderSettingsInput {
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
      return value.filter(
        (entry): entry is string => typeof entry === 'string',
      );
    }

    if (typeof value === 'string') {
      return value
        .split(',')
        .map((entry) => entry.trim())
        .filter((entry) => entry.length > 0);
    }

    return undefined;
  }

  private toOptionalLandingPage(value: unknown): LenderLandingPage | undefined {
    return value === 'dashboard' || value === 'analytics' ? value : undefined;
  }

  private toOptionalAnalyticsRange(
    value: unknown,
  ): AnalyticsRangeKey | undefined {
    return value === '30d' || value === '90d' || value === '365d'
      ? value
      : undefined;
  }
}
