import { Controller, Get, Req, UseGuards } from '@nestjs/common';

import type { AuthenticatedRequest } from '../../common/types/authenticated-request';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { LenderService } from './lender.service';
import type { LenderDashboardSummaryResponse } from './lender.types';

@Controller('lender')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('lender')
export class LenderController {
  constructor(private readonly lenderService: LenderService) {}

  @Get('dashboard/summary')
  getDashboardSummary(
    @Req() request: AuthenticatedRequest,
  ): Promise<LenderDashboardSummaryResponse> {
    return this.lenderService.getDashboardSummary(request.user.sub);
  }
}
