import { Controller, Get, Post, Param, Body, Query, UseGuards } from '@nestjs/common';
import { DisputesService } from './disputes.service';
import { ResolveDisputeDto } from './dto/resolve-dispute.dto';
import { EscalateDisputeDto } from './dto/escalate-dispute.dto';
import { AdminJwtGuard } from '../admin/admin-auth/guards/admin-jwt.guard';

@Controller('admin/disputes')
@UseGuards(AdminJwtGuard)
export class DisputesController {
  constructor(private readonly disputesService: DisputesService) {}

  @Get()
  async getAllDisputes(@Query('limit') limit?: string, @Query('cursor') cursor?: string) {
    return this.disputesService.getAllDisputes(limit, cursor);
  }

  @Get(':disputeId')
  async getDisputeById(@Param('disputeId') disputeId: string) {
    return this.disputesService.getDisputeById(disputeId);
  }

  @Post(':disputeId/resolve')
  async resolveDispute(
    @Param('disputeId') disputeId: string,
    @Body() resolveDisputeDto: ResolveDisputeDto,
  ) {
    return this.disputesService.resolveDispute(
      disputeId,
      resolveDisputeDto.resolution,
      resolveDisputeDto.notes,
    );
  }

  @Post(':disputeId/escalate')
  async escalateDispute(
    @Param('disputeId') disputeId: string,
    @Body() escalateDisputeDto: EscalateDisputeDto,
  ) {
    return this.disputesService.escalateDispute(
      disputeId,
      escalateDisputeDto.reason,
      escalateDisputeDto.notes,
    );
  }
}
