import {
  Controller,
  Get,
  Logger,
  Req,
  UseGuards,
} from '@nestjs/common';
import type { AuthenticatedRequest } from '../../common/types/authenticated-request';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { LenderRemindersService } from './lender_reminders.service';

@Controller('lender-mobile/payment-reminders')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('lender')
export class LenderRemindersController {
  private readonly logger = new Logger(LenderRemindersController.name);

  constructor(private readonly remindersService: LenderRemindersService) {}

  /**
   * GET /api/lender-mobile/payment-reminders?lenderId=
   * Returns upcoming payment reminders for the lender's active loans.
   */
  @Get()
  async getReminders(@Req() request: AuthenticatedRequest) {
    const lenderId = request.user.sub;
    this.logger.log(`Fetching reminders for lender ${lenderId}`);
    const reminders = await this.remindersService.getReminders(lenderId);
    return {
      success: true,
      message: 'Payment reminders retrieved successfully',
      data: reminders,
      total: reminders.length,
    };
  }
}
