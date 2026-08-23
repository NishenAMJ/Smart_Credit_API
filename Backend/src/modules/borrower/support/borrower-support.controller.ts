import { Controller, Get, Query, Req, UseGuards } from '@nestjs/common';
import type { AuthenticatedRequest } from '../../../common/types/authenticated-request';
import { Roles } from '../../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { resolveAuthenticatedBorrowerId } from '../shared/borrower-request.utils';
import { BorrowerSupportService } from './borrower-support.service';

@Controller('borrower/support')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('borrower')
export class BorrowerSupportController {
  constructor(
    private readonly borrowerSupportService: BorrowerSupportService,
  ) {}

  @Get('status')
  async getSupportStatus(
    @Req() req: AuthenticatedRequest,
    @Query('borrowerId') borrowerId?: string,
  ) {
    return {
      success: true,
      data: await this.borrowerSupportService.getSupportStatus(
        resolveAuthenticatedBorrowerId(req.user.sub, borrowerId),
      ),
    };
  }
}
