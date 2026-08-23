import { Body, Controller, Param, Post, Req, UseGuards } from '@nestjs/common';

import type { AuthenticatedRequest } from '../../common/types/authenticated-request';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { LenderRequestsService } from './lender_requests.service';

@Controller('lender-mobile/loan-requests')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('lender')
export class LenderRequestsController {
  constructor(private readonly requestsService: LenderRequestsService) {}

  @Post(':requestId/approve')
  async approveRequest(
    @Req() request: AuthenticatedRequest,
    @Param('requestId') requestId: string,
    @Body() body: { notes?: string },
  ) {
    const result = await this.requestsService.approveRequest(
      request.user.sub,
      requestId,
      body?.notes,
    );
    return {
      success: true,
      message: 'Application converted to a pending loan agreement.',
      data: result,
    };
  }

  @Post(':requestId/reject')
  async rejectRequest(
    @Req() request: AuthenticatedRequest,
    @Param('requestId') requestId: string,
    @Body() body: { reason?: string },
  ) {
    const result = await this.requestsService.rejectRequest(
      request.user.sub,
      requestId,
      body?.reason?.trim() || 'No reason provided',
    );
    return {
      success: true,
      message: 'Application rejected.',
      data: result,
    };
  }
}
