import { Body, Controller, Get, Param, Post, Query, Req, UseGuards } from '@nestjs/common';
import type { AuthenticatedRequest } from '../../../common/types/authenticated-request';
import { Roles } from '../../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { AdBoostsService } from './ad-boosts.service';

@Controller('admin/ad-boosts')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin')
export class AdminAdBoostsController {
  constructor(private readonly service: AdBoostsService) {}

  @Get()
  list(@Query('status') status?: string) {
    return this.service.listForAdmin(status);
  }

  @Post(':boostId/decision')
  decide(
    @Req() request: AuthenticatedRequest,
    @Param('boostId') boostId: string,
    @Body() body: { approved: boolean; reason?: string },
  ) {
    return this.service.decideBankPayment(
      request.user.sub,
      boostId,
      body.approved === true,
      body.reason,
    );
  }
}

