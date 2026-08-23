import { Controller, Get, Param, Req, UseGuards } from '@nestjs/common';
import type { AuthenticatedRequest } from '../../../common/types/authenticated-request';
import { Roles } from '../../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { resolveAuthenticatedBorrowerId } from '../shared/borrower-request.utils';
import { BorrowerDashboardService } from './borrower-dashboard.service';

@Controller('borrower/dashboard')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('borrower')
export class BorrowerDashboardController {
  constructor(
    private readonly borrowerDashboardService: BorrowerDashboardService,
  ) {}

  @Get(':userId')
  async getDashboard(
    @Req() req: AuthenticatedRequest,
    @Param('userId') userId: string,
  ) {
    return {
      success: true,
      data: await this.borrowerDashboardService.getDashboard(
        resolveAuthenticatedBorrowerId(req.user.sub, userId),
      ),
    };
  }
}
