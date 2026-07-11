import {
  BadRequestException,
  Controller,
  Get,
  Param,
  Put,
  Query,
} from '@nestjs/common';
import { BorrowerNotificationsService } from './borrower-notifications.service';
import type { BorrowerNotificationState } from './borrower-notifications.types';

@Controller('borrower/notifications')
export class BorrowerNotificationsController {
  constructor(
    private readonly borrowerNotificationsService: BorrowerNotificationsService,
  ) {}

  @Get('summary')
  async getSummary(@Query('borrowerId') borrowerId?: string) {
    return {
      success: true,
      data: await this.borrowerNotificationsService.getSummary(
        this.resolveBorrowerId(borrowerId),
      ),
    };
  }

  @Get()
  async getNotifications(
    @Query('borrowerId') borrowerId?: string,
    @Query('state') state?: BorrowerNotificationState,
    @Query('pageSize') pageSize?: string,
    @Query('limit') limit?: string,
    @Query('cursor') cursor?: string,
  ) {
    return {
      success: true,
      data: await this.borrowerNotificationsService.getNotifications(
        this.resolveBorrowerId(borrowerId),
        this.resolveStateFilter(state),
        this.toNumber(pageSize) ?? this.toNumber(limit) ?? 30,
        cursor?.trim() || null,
      ),
    };
  }

  @Put('mark-all-read')
  async markAllAsRead(@Query('borrowerId') borrowerId?: string) {
    return {
      success: true,
      data: await this.borrowerNotificationsService.markAllAsRead(
        this.resolveBorrowerId(borrowerId),
      ),
    };
  }

  @Put(':notificationId/read')
  async markAsRead(
    @Param('notificationId') notificationId: string,
    @Query('borrowerId') borrowerId?: string,
  ) {
    if (!notificationId.trim()) {
      throw new BadRequestException('notificationId is required.');
    }

    return {
      success: true,
      data: await this.borrowerNotificationsService.markAsRead(
        this.resolveBorrowerId(borrowerId),
        notificationId.trim(),
      ),
    };
  }

  private resolveBorrowerId(borrowerId?: string): string {
    const trimmed = borrowerId?.trim();

    if (!trimmed) {
      throw new BadRequestException(
        'Borrower identification is required for this operation.',
      );
    }

    return trimmed;
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

