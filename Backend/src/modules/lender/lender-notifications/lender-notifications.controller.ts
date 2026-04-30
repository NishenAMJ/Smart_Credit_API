import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Query,
} from '@nestjs/common';
import { LenderNotificationsService } from './lender-notifications.service';
import {
  LenderNotification,
  LenderNotificationsListResponse,
  LenderNotificationsSummaryResponse,
  MarkAllNotificationsReadResponse,
  NotificationStateFilter,
} from './lender-notifications.types';

type MarkAsReadBody = {
  lenderId?: string;
};

@Controller('lender-notifications')
export class LenderNotificationsController {
  constructor(
    private readonly lenderNotificationsService: LenderNotificationsService,
  ) {}

  @Get('summary')
  getSummary(
    @Query('lenderId') lenderId: string,
  ): Promise<LenderNotificationsSummaryResponse> {
    const normalizedLenderId = lenderId?.trim();

    if (!normalizedLenderId) {
      throw new BadRequestException('lenderId is required.');
    }

    return this.lenderNotificationsService.getSummary(normalizedLenderId);
  }

  @Get()
  getNotifications(
    @Query('lenderId') lenderId: string,
    @Query('category') category?: string,
    @Query('state') state?: string,
    @Query('pageSize') pageSize?: string,
    @Query('limit') limit?: string,
    @Query('cursor') cursor?: string,
  ): Promise<LenderNotificationsListResponse> {
    const normalizedLenderId = lenderId?.trim();

    if (!normalizedLenderId) {
      throw new BadRequestException('lenderId is required.');
    }

    return this.lenderNotificationsService.getNotifications(
      normalizedLenderId,
      category?.trim(),
      this.resolveStateFilter(state),
      this.toNumber(pageSize) ?? this.toNumber(limit) ?? 60,
      cursor?.trim() || null,
    );
  }

  @Patch('mark-all-read')
  markAllAsRead(
    @Query('lenderId') lenderId: string,
    @Query('category') category?: string,
    @Query('state') state?: string,
  ): Promise<MarkAllNotificationsReadResponse> {
    const normalizedLenderId = lenderId?.trim();

    if (!normalizedLenderId) {
      throw new BadRequestException('lenderId is required.');
    }

    return this.lenderNotificationsService.markAllAsRead(
      normalizedLenderId,
      category?.trim(),
      this.resolveStateFilter(state),
    );
  }

  @Patch(':notificationId/read')
  markAsRead(
    @Param('notificationId') notificationId: string,
    @Body() body: MarkAsReadBody,
  ): Promise<LenderNotification> {
    const normalizedLenderId = body.lenderId?.trim();

    if (!normalizedLenderId) {
      throw new BadRequestException('lenderId is required.');
    }

    if (!notificationId.trim()) {
      throw new BadRequestException('notificationId is required.');
    }

    return this.lenderNotificationsService.markAsRead(
      normalizedLenderId,
      notificationId.trim(),
    );
  }

  private resolveStateFilter(value: string | undefined): NotificationStateFilter {
    if (value === 'read' || value === 'unread') {
      return value;
    }

    return 'all';
  }

  private toNumber(value: string | undefined): number | null {
    if (!value) {
      return null;
    }

    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
}
