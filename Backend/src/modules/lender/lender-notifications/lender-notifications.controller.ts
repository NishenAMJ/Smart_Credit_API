import {
  BadRequestException,
  Controller,
  Get,
  Param,
  Patch,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import type { AuthenticatedRequest } from '../../../common/types/authenticated-request';
import { Roles } from '../../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { LenderNotificationsService } from './lender-notifications.service';
import {
  LenderNotification,
  LenderNotificationsListResponse,
  LenderNotificationsSummaryResponse,
  MarkAllNotificationsReadResponse,
  NotificationStateFilter,
} from './lender-notifications.types';

@Controller('lender-notifications')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('lender')
export class LenderNotificationsController {
  constructor(
    private readonly lenderNotificationsService: LenderNotificationsService,
  ) {}

  @Get('summary')
  getSummary(
    @Req() req: AuthenticatedRequest,
  ): Promise<LenderNotificationsSummaryResponse> {
    return this.lenderNotificationsService.getSummary(req.user.sub);
  }

  @Get()
  getNotifications(
    @Req() req: AuthenticatedRequest,
    @Query('category') category?: string,
    @Query('state') state?: string,
    @Query('pageSize') pageSize?: string,
    @Query('limit') limit?: string,
    @Query('cursor') cursor?: string,
  ): Promise<LenderNotificationsListResponse> {
    return this.lenderNotificationsService.getNotifications(
      req.user.sub,
      category?.trim(),
      this.resolveStateFilter(state),
      this.toNumber(pageSize) ?? this.toNumber(limit) ?? 60,
      cursor?.trim() || null,
    );
  }

  @Patch('mark-all-read')
  markAllAsRead(
    @Req() req: AuthenticatedRequest,
    @Query('category') category?: string,
    @Query('state') state?: string,
  ): Promise<MarkAllNotificationsReadResponse> {
    return this.lenderNotificationsService.markAllAsRead(
      req.user.sub,
      category?.trim(),
      this.resolveStateFilter(state),
    );
  }

  @Patch(':notificationId/read')
  markAsRead(
    @Req() req: AuthenticatedRequest,
    @Param('notificationId') notificationId: string,
  ): Promise<LenderNotification> {
    if (!notificationId.trim()) {
      throw new BadRequestException('notificationId is required.');
    }

    return this.lenderNotificationsService.markAsRead(
      req.user.sub,
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
