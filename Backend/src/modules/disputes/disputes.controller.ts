import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
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
  AssignDisputeDto,
  ChangeDisputePriorityDto,
  CloseDisputeDto,
  RequestDisputeInformationDto,
  ResolveCanonicalDisputeDto,
} from './dto/dispute.dto';
import { EscalateDisputeDto } from './dto/escalate-dispute.dto';
import { ResolveDisputeDto } from './dto/resolve-dispute.dto';
import { DisputesService } from './disputes.service';
import type {
  DisputePriority,
  DisputeStatus,
} from './interfaces/dispute.interface';

@Controller('admin/disputes')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin')
export class DisputesController {
  constructor(private readonly disputesService: DisputesService) {}

  @Get('stats')
  getStats() {
    return this.disputesService.getStats();
  }

  @Get()
  getAllDisputes(
    @Query('limit') limit?: string,
    @Query('cursor') cursor?: string,
    @Query('status') status?: DisputeStatus,
    @Query('priority') priority?: DisputePriority,
    @Query('assignedAdminId') assignedAdminId?: string,
    @Query('search') search?: string,
  ) {
    return this.disputesService.getAllDisputes(limit, cursor, {
      status,
      priority,
      assignedAdminId,
      search,
    });
  }

  @Get(':disputeId/events')
  getEvents(
    @Req() req: AuthenticatedRequest,
    @Param('disputeId') disputeId: string,
  ) {
    return this.disputesService.getEvents(disputeId, req.user.sub, 'admin');
  }

  @Get(':disputeId')
  getDisputeById(
    @Req() req: AuthenticatedRequest,
    @Param('disputeId') disputeId: string,
  ) {
    return this.disputesService.getDisputeById(
      disputeId,
      req.user.sub,
      'admin',
    );
  }

  @Patch(':disputeId/assignment')
  assign(
    @Req() req: AuthenticatedRequest,
    @Param('disputeId') disputeId: string,
    @Body() body: AssignDisputeDto,
  ) {
    return this.disputesService.assign(disputeId, req.user.sub, body.adminId);
  }

  @Patch(':disputeId/priority')
  priority(
    @Req() req: AuthenticatedRequest,
    @Param('disputeId') disputeId: string,
    @Body() body: ChangeDisputePriorityDto,
  ) {
    return this.disputesService.changePriority(
      disputeId,
      req.user.sub,
      body.priority,
      body.reason,
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
      'admin',
      body,
    );
  }

  @Post(':disputeId/request-information')
  requestInformation(
    @Req() req: AuthenticatedRequest,
    @Param('disputeId') disputeId: string,
    @Body() body: RequestDisputeInformationDto,
  ) {
    return this.disputesService.requestInformation(
      disputeId,
      req.user.sub,
      body.requestedFrom,
      body.message,
    );
  }

  @Post(':disputeId/resolve-canonical')
  resolveCanonical(
    @Req() req: AuthenticatedRequest,
    @Param('disputeId') disputeId: string,
    @Body() body: ResolveCanonicalDisputeDto,
  ) {
    return this.disputesService.resolveCanonical(disputeId, req.user.sub, body);
  }

  @Post(':disputeId/resolve')
  resolveDispute(
    @Req() req: AuthenticatedRequest,
    @Param('disputeId') disputeId: string,
    @Body() body: ResolveDisputeDto,
  ) {
    return this.disputesService.resolveDispute(
      disputeId,
      body.resolution,
      body.notes,
      req.user.sub,
    );
  }

  @Post(':disputeId/escalate')
  escalateDispute(
    @Req() req: AuthenticatedRequest,
    @Param('disputeId') disputeId: string,
    @Body() body: EscalateDisputeDto,
  ) {
    return this.disputesService.escalateDispute(
      disputeId,
      body.reason,
      body.notes,
      req.user.sub,
    );
  }

  @Post(':disputeId/close')
  close(
    @Req() req: AuthenticatedRequest,
    @Param('disputeId') disputeId: string,
    @Body() body: CloseDisputeDto,
  ) {
    return this.disputesService.close(disputeId, req.user.sub, body.reason);
  }
}
