import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import type { AuthenticatedRequest } from '../../common/types/authenticated-request';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import {
  AddDisputeCommentDto,
  CreateDisputeDto,
  ReopenDisputeDto,
} from './dto/dispute.dto';
import { DisputesService } from './disputes.service';
import type { DisputeStatus } from './interfaces/dispute.interface';

@Controller('disputes')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('borrower', 'lender')
export class ParticipantDisputesController {
  constructor(private readonly disputesService: DisputesService) {}

  @Get('eligible-loans')
  getEligibleLoans(@Req() req: AuthenticatedRequest) {
    return this.disputesService.getEligibleLoans(req.user.sub, req.user.role);
  }

  @Post()
  create(@Req() req: AuthenticatedRequest, @Body() body: CreateDisputeDto) {
    return this.disputesService.createDispute(
      req.user.sub,
      req.user.role,
      body,
    );
  }

  @Get('mine')
  getMine(
    @Req() req: AuthenticatedRequest,
    @Query('status') status?: DisputeStatus,
    @Query('limit') limit?: string,
    @Query('cursor') cursor?: string,
  ) {
    return this.disputesService.getMyDisputes(
      req.user.sub,
      status,
      limit,
      cursor,
    );
  }

  @Get(':disputeId/events')
  getEvents(
    @Req() req: AuthenticatedRequest,
    @Param('disputeId') disputeId: string,
  ) {
    return this.disputesService.getEvents(
      disputeId,
      req.user.sub,
      req.user.role,
    );
  }

  @Post(':disputeId/comments')
  comment(
    @Req() req: AuthenticatedRequest,
    @Param('disputeId') disputeId: string,
    @Body() body: AddDisputeCommentDto,
  ) {
    return this.disputesService.addComment(
      disputeId,
      req.user.sub,
      req.user.role,
      body,
    );
  }

  @Post(':disputeId/acknowledge')
  acknowledge(
    @Req() req: AuthenticatedRequest,
    @Param('disputeId') disputeId: string,
  ) {
    return this.disputesService.acknowledge(
      disputeId,
      req.user.sub,
      req.user.role,
    );
  }

  @Post(':disputeId/reopen')
  reopen(
    @Req() req: AuthenticatedRequest,
    @Param('disputeId') disputeId: string,
    @Body() body: ReopenDisputeDto,
  ) {
    return this.disputesService.reopen(
      disputeId,
      req.user.sub,
      req.user.role,
      body.reason,
    );
  }

  @Get(':disputeId')
  getOne(
    @Req() req: AuthenticatedRequest,
    @Param('disputeId') disputeId: string,
  ) {
    return this.disputesService.getDisputeById(
      disputeId,
      req.user.sub,
      req.user.role,
    );
  }
}
