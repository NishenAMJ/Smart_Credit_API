import { Controller, Get, Param, Patch, Query, Req, UseGuards } from '@nestjs/common';
import type { AuthenticatedRequest } from '../../common/types/authenticated-request';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import {
  AdminNotificationsService,
  type AdminNotificationState,
} from './admin-notifications.service';

@Controller('admin/notifications')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin')
export class AdminNotificationsController {
  constructor(private readonly notifications: AdminNotificationsService) {}

  @Get()
  async list(
    @Req() request: AuthenticatedRequest,
    @Query('state') state?: AdminNotificationState,
    @Query('limit') limit?: string,
  ) {
    return {
      success: true,
      data: await this.notifications.list(
        request.user.sub,
        state === 'read' || state === 'unread' ? state : 'all',
        Number(limit) || 50,
      ),
    };
  }

  @Get('summary')
  async summary(@Req() request: AuthenticatedRequest) {
    return {
      success: true,
      data: await this.notifications.summary(request.user.sub),
    };
  }

  @Patch('mark-all-read')
  async markAll(@Req() request: AuthenticatedRequest) {
    return {
      success: true,
      data: await this.notifications.markAllAsRead(request.user.sub),
    };
  }

  @Patch(':notificationId/read')
  async markOne(
    @Req() request: AuthenticatedRequest,
    @Param('notificationId') notificationId: string,
  ) {
    return {
      success: true,
      data: await this.notifications.markAsRead(
        request.user.sub,
        notificationId,
      ),
    };
  }
}
