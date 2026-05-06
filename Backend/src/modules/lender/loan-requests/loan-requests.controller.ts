import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import type { AuthenticatedRequest } from '../../../common/types/authenticated-request';
import { Roles } from '../../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { LoanRequestDecisionResponse } from './loan-requests.dto';
import { LoanRequestsService } from './loan-requests.service';
import { PendingRequestsResponse } from './loan-requests.types';

@Controller('loan-requests')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('lender')
export class LoanRequestsController {
  constructor(private readonly loanRequestsService: LoanRequestsService) {}

  @Get('pending')
  getPendingRequests(
    @Req() req: AuthenticatedRequest,
    @Query('pageSize') pageSize?: string,
    @Query('limit') limit?: string,
    @Query('cursor') cursor?: string,
    @Query('adId') adId?: string,
    @Query('includeSummary') includeSummary?: string,
    @Query('includeAllStatuses') includeAllStatuses?: string,
  ): Promise<PendingRequestsResponse> {
    return this.loanRequestsService.getPendingRequests(
      req.user.sub,
      this.toNumber(pageSize) ?? this.toNumber(limit) ?? 30,
      cursor?.trim() || null,
      includeSummary !== 'false',
      adId?.trim() || null,
      includeAllStatuses === 'true',
    );
  }

  @Post(':requestId/approve')
  approveRequest(
    @Req() req: AuthenticatedRequest,
    @Param('requestId') requestId: string,
    @Body() body?: { notes?: string },
  ): Promise<LoanRequestDecisionResponse> {
    return this.loanRequestsService.approveRequest(
      req.user.sub,
      requestId?.trim(),
      body?.notes,
    );
  }

  @Post(':requestId/reject')
  rejectRequest(
    @Req() req: AuthenticatedRequest,
    @Param('requestId') requestId: string,
    @Body() body?: { reason?: string },
  ): Promise<LoanRequestDecisionResponse> {
    if (!body?.reason || body.reason.trim().length === 0) {
      throw new BadRequestException('reason is required for rejection.');
    }

    return this.loanRequestsService.rejectRequest(
      req.user.sub,
      requestId?.trim(),
      body.reason,
    );
  }

  @Post(':requestId/review')
  markUnderReview(
    @Req() req: AuthenticatedRequest,
    @Param('requestId') requestId: string,
    @Body() body?: { notes?: string },
  ): Promise<LoanRequestDecisionResponse> {
    return this.loanRequestsService.markUnderReview(
      req.user.sub,
      requestId?.trim(),
      body?.notes,
    );
  }

  private toNumber(value: string | undefined): number | null {
    if (!value) {
      return null;
    }

    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
}
