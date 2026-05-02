import {
  Controller,
  Get,
  Query,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { LenderRemindersService } from './lender_reminders.service';

@Controller('lender-mobile/payment-reminders')
export class LenderRemindersController {
  private readonly logger = new Logger(LenderRemindersController.name);

  constructor(private readonly remindersService: LenderRemindersService) {}

  /**
   * GET /api/lender-mobile/payment-reminders?lenderId=
   * Returns upcoming payment reminders for the lender's active loans.
   */
  @Get()
  async getReminders(@Query('lenderId') lenderId: string) {
    if (!lenderId?.trim()) {
      throw new BadRequestException('lenderId is required.');
    }

    this.logger.log(`Fetching reminders for lender ${lenderId}`);
    const reminders = await this.remindersService.getReminders(lenderId.trim());
    return {
      success: true,
      message: 'Payment reminders retrieved successfully',
      data: reminders,
      total: reminders.length,
    };
  }
}
