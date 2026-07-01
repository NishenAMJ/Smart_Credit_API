import { Controller, Get, Query } from '@nestjs/common';
import { resolveBorrowerId } from '../borrower-request.utils';
import { BorrowerSupportService } from './borrower-support.service';

@Controller('borrower/support')
export class BorrowerSupportController {
  constructor(private readonly borrowerSupportService: BorrowerSupportService) {}

  @Get('status')
  async getSupportStatus(@Query('borrowerId') borrowerId?: string) {
    return {
      success: true,
      data: await this.borrowerSupportService.getSupportStatus(
        resolveBorrowerId(borrowerId),
      ),
    };
  }
}
