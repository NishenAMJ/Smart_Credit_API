import {
  BadRequestException,
  Controller,
  Get,
  Param,
  Put,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import type { AuthenticatedRequest } from '../../../common/types/authenticated-request';
import { Roles } from '../../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { BorrowerNotificationsService } from './borrower-notifications.service';
import type { BorrowerNotificationState } from './borrower-notifications.types';

@Controller('borrower/notifications')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('borrower')
export class BorrowerNotificationsController {
  constructor(
    private readonly borrowerNotificationsService: BorrowerNotificationsService,
  ) {}

  @Get('summary')
  async getSummary(
    @Req() req: AuthenticatedRequest,
  ) {
    return {
      success: true,
      data: await this.borrowerNotificationsService.getSummary(
        req.user.sub,
      ),
    };
  }

  @Get()
  async getNotifications(
    @Req() req: AuthenticatedRequest,
    @Query('state') state?: BorrowerNotificationState,
    @Query('pageSize') pageSize?: string,
    @Query('limit') limit?: string,
    @Query('cursor') cursor?: string,
  ) {
    return {
      success: true,
      data: await this.borrowerNotificationsService.getNotifications(
        req.user.sub,
        this.resolveStateFilter(state),
        this.toNumber(pageSize) ?? this.toNumber(limit) ?? 30,
        cursor?.trim() || null,
      ),
    };
  }

  @Put('mark-all-read')
  async markAllAsRead(
    @Req() req: AuthenticatedRequest,
  ) {
    return {
      success: true,
      data: await this.borrowerNotificationsService.markAllAsRead(
        req.user.sub,
      ),
    };
  }

  @Put(':notificationId/read')
  async markAsRead(
    @Req() req: AuthenticatedRequest,
    @Param('notificationId') notificationId: string,
  ) {
    if (!notificationId.trim()) {
      throw new BadRequestException('notificationId is required.');
    }

    return {
      success: true,
      data: await this.borrowerNotificationsService.markAsRead(
        req.user.sub,
        notificationId.trim(),
      ),
    };
  }

  private resolveStateFilter(
    value: BorrowerNotificationState | undefined,
  ): BorrowerNotificationState {
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
