import {
  Controller,
  Post,
  Param,
  Query,
  Body,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { LenderRequestsService } from './lender_requests.service';

@Controller('lender-mobile/loan-requests')
export class LenderRequestsController {
  private readonly logger = new Logger(LenderRequestsController.name);

  constructor(private readonly requestsService: LenderRequestsService) {}

  /**
   * POST /api/lender-mobile/loan-requests/:requestId/approve?lenderId=
   * Approve a loan request.
   */
  @Post(':requestId/approve')
  async approveRequest(
    @Param('requestId') requestId: string,
    @Query('lenderId') lenderId: string,
    @Body() body: { notes?: string },
  ) {
    if (!lenderId?.trim()) {
      throw new BadRequestException('lenderId is required.');
    }

    this.logger.log(`Approving request ${requestId} by lender ${lenderId}`);
    const result = await this.requestsService.approveRequest(
      lenderId.trim(),
      requestId,
      body?.notes,
    );
    return {
      success: true,
      message: 'Application approved successfully',
      data: result,
    };
  }

  /**
   * POST /api/lender-mobile/loan-requests/:requestId/reject?lenderId=
   * Reject a loan request with a reason.
   */
  @Post(':requestId/reject')
  async rejectRequest(
    @Param('requestId') requestId: string,
    @Query('lenderId') lenderId: string,
    @Body() body: { reason: string },
  ) {
    if (!lenderId?.trim()) {
      throw new BadRequestException('lenderId is required.');
    }

    if (!body?.reason?.trim()) {
      throw new BadRequestException('reason is required for rejection.');
    }

    this.logger.log(`Rejecting request ${requestId} by lender ${lenderId}`);
    const result = await this.requestsService.rejectRequest(
      lenderId.trim(),
      requestId,
      body.reason.trim(),
    );
    return {
      success: true,
      message: 'Application rejected successfully',
      data: result,
    };
  }
}
