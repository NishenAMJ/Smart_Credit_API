import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Timestamp } from 'firebase-admin/firestore';
import { FirebaseService } from '../firebase/firebase.service';
import { hasRole, readDate } from '../firebase/firestore-query.utils';
import {
  AnalyticsRangeKey,
  LenderLandingPage,
  LenderSettingsResponse,
  UpdateLenderSettingsInput,
} from './lender-settings.types';

const DEFAULT_NOTIFICATION_SETTINGS = {
  inAppNewRequests: true,
  emailNewRequests: false,
  inAppTransactions: true,
  emailTransactions: false,
  inAppStatusUpdates: true,
  emailStatusUpdates: false,
  inAppOverdues: true,
  emailOverdues: false,
  inAppAdExpiry: true,
  emailAdExpiry: false,
  inAppDisputes: true,
  emailDisputes: false,
};

const DEFAULT_LENDING_SETTINGS = {
  defaultInterestRate: 14.5,
  defaultMaxTenureMonths: 12,
  defaultMinAmount: 50000,
  defaultMaxAmount: 250000,
  preferredPurposes: [] as string[],
  preferredRegions: [] as string[],
  defaultResponseTimeHours: 24,
};

const DEFAULT_WORKSPACE_SETTINGS = {
  defaultLandingPage: 'dashboard' as LenderLandingPage,
  defaultAnalyticsRange: '90d' as AnalyticsRangeKey,
  pendingRequestsPageSize: 30,
  borrowerTablePageSize: 8,
};

const LANDING_PAGE_OPTIONS: LenderLandingPage[] = ['dashboard', 'analytics'];
const ANALYTICS_RANGE_OPTIONS: AnalyticsRangeKey[] = ['30d', '90d', '365d'];

@Injectable()
export class LenderSettingsService {
  constructor(private readonly firebaseService: FirebaseService) {}

  async getSettings(lenderId: string): Promise<LenderSettingsResponse> {
    const lenderData = await this.getLenderData(lenderId);
    const snapshot = await this.firebaseService
      .getDb()
      .collection('lenderSettings')
      .doc(lenderId)
      .get();

    return this.mapSettings(lenderId, snapshot.data() ?? {}, lenderData);
  }

  async updateSettings(
    lenderId: string,
    input: UpdateLenderSettingsInput,
  ): Promise<LenderSettingsResponse> {
    const lenderData = await this.getLenderData(lenderId);
    const docRef = this.firebaseService
      .getDb()
      .collection('lenderSettings')
      .doc(lenderId);
    const existingSnapshot = await docRef.get();
    const current = this.mapSettings(
      lenderId,
      existingSnapshot.data() ?? {},
      lenderData,
    );
    const next = this.mergeSettings(current, input);

    this.validateSettings(next);

    const timestamp = Timestamp.now();

    await docRef.set({
      lenderId,
      notifications: next.notifications,
      lendingDefaults: {
        ...next.lendingDefaults,
        preferredPurposes: this.uniqueValues(next.lendingDefaults.preferredPurposes),
        preferredRegions: this.uniqueValues(next.lendingDefaults.preferredRegions),
      },
      workspace: next.workspace,
      updatedAt: timestamp,
    });

    return {
      ...next,
      updatedAt: timestamp.toDate().toISOString(),
    };
  }

  private async getLenderData(
    lenderId: string,
  ): Promise<Record<string, unknown>> {
    const snapshot = await this.firebaseService
      .getDb()
      .collection('users')
      .doc(lenderId)
      .get();

    if (!snapshot.exists) {
      throw new NotFoundException(`Lender ${lenderId} was not found.`);
    }

    const data = snapshot.data();

    if (!data || !hasRole(data.role, 'lender')) {
      throw new NotFoundException(`Lender ${lenderId} was not found.`);
    }

    return data;
  }

  private mapSettings(
    lenderId: string,
    rawData: Record<string, unknown>,
    lenderData: Record<string, unknown>,
  ): LenderSettingsResponse {
    const defaultSettings = this.buildDefaultSettings(lenderId, lenderData);
    const notifications = this.toRecord(rawData.notifications);
    const lendingDefaults = this.toRecord(rawData.lendingDefaults);
    const workspace = this.toRecord(rawData.workspace);

    return {
      lenderId,
      notifications: {
        inAppNewRequests: this.readBoolean(
          notifications.inAppNewRequests,
          defaultSettings.notifications.inAppNewRequests,
        ),
        emailNewRequests: this.readBoolean(
          notifications.emailNewRequests,
          defaultSettings.notifications.emailNewRequests,
        ),
        inAppTransactions: this.readBoolean(
          notifications.inAppTransactions,
          defaultSettings.notifications.inAppTransactions,
        ),
        emailTransactions: this.readBoolean(
          notifications.emailTransactions,
          defaultSettings.notifications.emailTransactions,
        ),
        inAppStatusUpdates: this.readBoolean(
          notifications.inAppStatusUpdates,
          defaultSettings.notifications.inAppStatusUpdates,
        ),
        emailStatusUpdates: this.readBoolean(
          notifications.emailStatusUpdates,
          defaultSettings.notifications.emailStatusUpdates,
        ),
        inAppOverdues: this.readBoolean(
          notifications.inAppOverdues,
          defaultSettings.notifications.inAppOverdues,
        ),
        emailOverdues: this.readBoolean(
          notifications.emailOverdues,
          defaultSettings.notifications.emailOverdues,
        ),
        inAppAdExpiry: this.readBoolean(
          notifications.inAppAdExpiry,
          defaultSettings.notifications.inAppAdExpiry,
        ),
        emailAdExpiry: this.readBoolean(
          notifications.emailAdExpiry,
          defaultSettings.notifications.emailAdExpiry,
        ),
        inAppDisputes: this.readBoolean(
          notifications.inAppDisputes,
          defaultSettings.notifications.inAppDisputes,
        ),
        emailDisputes: this.readBoolean(
          notifications.emailDisputes,
          defaultSettings.notifications.emailDisputes,
        ),
      },
      lendingDefaults: {
        defaultInterestRate: this.readNumber(
          lendingDefaults.defaultInterestRate,
          defaultSettings.lendingDefaults.defaultInterestRate,
        ),
        defaultMaxTenureMonths: this.readNumber(
          lendingDefaults.defaultMaxTenureMonths,
          defaultSettings.lendingDefaults.defaultMaxTenureMonths,
        ),
        defaultMinAmount: this.readNumber(
          lendingDefaults.defaultMinAmount,
          defaultSettings.lendingDefaults.defaultMinAmount,
        ),
        defaultMaxAmount: this.readNumber(
          lendingDefaults.defaultMaxAmount,
          defaultSettings.lendingDefaults.defaultMaxAmount,
        ),
        preferredPurposes: this.readStringArray(
          lendingDefaults.preferredPurposes,
          defaultSettings.lendingDefaults.preferredPurposes,
        ),
        preferredRegions: this.readStringArray(
          lendingDefaults.preferredRegions,
          defaultSettings.lendingDefaults.preferredRegions,
        ),
        defaultResponseTimeHours: this.readNumber(
          lendingDefaults.defaultResponseTimeHours,
          defaultSettings.lendingDefaults.defaultResponseTimeHours,
        ),
      },
      workspace: {
        defaultLandingPage: this.readLandingPage(
          workspace.defaultLandingPage,
          defaultSettings.workspace.defaultLandingPage,
        ),
        defaultAnalyticsRange: this.readAnalyticsRange(
          workspace.defaultAnalyticsRange,
          defaultSettings.workspace.defaultAnalyticsRange,
        ),
        pendingRequestsPageSize: this.readNumber(
          workspace.pendingRequestsPageSize,
          defaultSettings.workspace.pendingRequestsPageSize,
        ),
        borrowerTablePageSize: this.readNumber(
          workspace.borrowerTablePageSize,
          defaultSettings.workspace.borrowerTablePageSize,
        ),
      },
      updatedAt: this.toIsoString(rawData.updatedAt),
    };
  }

  private buildDefaultSettings(
    lenderId: string,
    lenderData: Record<string, unknown>,
  ): LenderSettingsResponse {
    return {
      lenderId,
      notifications: { ...DEFAULT_NOTIFICATION_SETTINGS },
      lendingDefaults: {
        ...DEFAULT_LENDING_SETTINGS,
        preferredRegions: this.readStringArray(lenderData.preferredRegions, []),
        defaultResponseTimeHours: this.readNumber(
          lenderData.responseTimeHours,
          DEFAULT_LENDING_SETTINGS.defaultResponseTimeHours,
        ),
      },
      workspace: { ...DEFAULT_WORKSPACE_SETTINGS },
      updatedAt: null,
    };
  }

  private mergeSettings(
    current: LenderSettingsResponse,
    input: UpdateLenderSettingsInput,
  ): LenderSettingsResponse {
    return {
      ...current,
      notifications: {
        ...current.notifications,
        ...this.cleanObject(input.notifications),
      },
      lendingDefaults: {
        ...current.lendingDefaults,
        ...this.cleanObject(input.lendingDefaults),
        preferredPurposes:
          input.lendingDefaults?.preferredPurposes !== undefined
            ? this.uniqueValues(input.lendingDefaults.preferredPurposes)
            : current.lendingDefaults.preferredPurposes,
        preferredRegions:
          input.lendingDefaults?.preferredRegions !== undefined
            ? this.uniqueValues(input.lendingDefaults.preferredRegions)
            : current.lendingDefaults.preferredRegions,
      },
      workspace: {
        ...current.workspace,
        ...this.cleanObject(input.workspace),
      },
    };
  }

  private validateSettings(settings: LenderSettingsResponse): void {
    if (
      settings.lendingDefaults.defaultInterestRate <= 0 ||
      settings.lendingDefaults.defaultInterestRate > 100
    ) {
      throw new BadRequestException(
        'defaultInterestRate must be between 0 and 100.',
      );
    }

    if (
      settings.lendingDefaults.defaultMaxTenureMonths < 1 ||
      settings.lendingDefaults.defaultMaxTenureMonths > 120
    ) {
      throw new BadRequestException(
        'defaultMaxTenureMonths must be between 1 and 120.',
      );
    }

    if (
      settings.lendingDefaults.defaultMinAmount < 0 ||
      settings.lendingDefaults.defaultMaxAmount <= 0
    ) {
      throw new BadRequestException(
        'defaultMinAmount and defaultMaxAmount must be valid positive amounts.',
      );
    }

    if (
      settings.lendingDefaults.defaultMaxAmount <
      settings.lendingDefaults.defaultMinAmount
    ) {
      throw new BadRequestException(
        'defaultMaxAmount must be greater than or equal to defaultMinAmount.',
      );
    }

    if (
      settings.lendingDefaults.defaultResponseTimeHours < 1 ||
      settings.lendingDefaults.defaultResponseTimeHours > 72
    ) {
      throw new BadRequestException(
        'defaultResponseTimeHours must be between 1 and 72.',
      );
    }

    if (
      !LANDING_PAGE_OPTIONS.includes(settings.workspace.defaultLandingPage)
    ) {
      throw new BadRequestException('defaultLandingPage is invalid.');
    }

    if (
      !ANALYTICS_RANGE_OPTIONS.includes(settings.workspace.defaultAnalyticsRange)
    ) {
      throw new BadRequestException('defaultAnalyticsRange is invalid.');
    }

    if (
      settings.workspace.pendingRequestsPageSize < 1 ||
      settings.workspace.pendingRequestsPageSize > 100
    ) {
      throw new BadRequestException(
        'pendingRequestsPageSize must be between 1 and 100.',
      );
    }

    if (
      settings.workspace.borrowerTablePageSize < 1 ||
      settings.workspace.borrowerTablePageSize > 100
    ) {
      throw new BadRequestException(
        'borrowerTablePageSize must be between 1 and 100.',
      );
    }
  }

  private cleanObject<T extends Record<string, unknown>>(
    value: T | undefined,
  ): Partial<T> {
    if (!value) {
      return {};
    }

    return Object.fromEntries(
      Object.entries(value).filter(([, entry]) => entry !== undefined),
    ) as Partial<T>;
  }

  private uniqueValues(values: string[]): string[] {
    return Array.from(
      new Set(values.map((value) => value.trim()).filter((value) => value.length > 0)),
    );
  }

  private toRecord(value: unknown): Record<string, unknown> {
    return value && typeof value === 'object' && !Array.isArray(value)
      ? (value as Record<string, unknown>)
      : {};
  }

  private readBoolean(value: unknown, fallback: boolean): boolean {
    return typeof value === 'boolean' ? value : fallback;
  }

  private readNumber(value: unknown, fallback: number): number {
    return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
  }

  private readStringArray(value: unknown, fallback: string[]): string[] {
    return Array.isArray(value)
      ? this.uniqueValues(
          value.filter((entry): entry is string => typeof entry === 'string'),
        )
      : fallback;
  }

  private readLandingPage(
    value: unknown,
    fallback: LenderLandingPage,
  ): LenderLandingPage {
    return typeof value === 'string' &&
      LANDING_PAGE_OPTIONS.includes(value as LenderLandingPage)
      ? (value as LenderLandingPage)
      : fallback;
  }

  private readAnalyticsRange(
    value: unknown,
    fallback: AnalyticsRangeKey,
  ): AnalyticsRangeKey {
    return typeof value === 'string' &&
      ANALYTICS_RANGE_OPTIONS.includes(value as AnalyticsRangeKey)
      ? (value as AnalyticsRangeKey)
      : fallback;
  }

  private toIsoString(value: unknown): string | null {
    return readDate(value)?.toISOString() ?? null;
  }
}
