import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  Query,
  UseGuards,
} from '@nestjs/common';
import { DisputesService } from './disputes.service';
import { ResolveDisputeDto } from './dto/resolve-dispute.dto';
import { EscalateDisputeDto } from './dto/escalate-dispute.dto';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';

@Controller('admin/disputes')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin')
export class DisputesController {
  constructor(private readonly disputesService: DisputesService) {}

  // Returns the admin list of disputes with paging support.
  @Get()
  async getAllDisputes(
    @Query('limit') limit?: string,
    @Query('cursor') cursor?: string,
  ) {
    return this.disputesService.getAllDisputes(limit, cursor);
  }

  @Get(':disputeId')
  // Returns one dispute so the admin can inspect it.
  async getDisputeById(@Param('disputeId') disputeId: string) {
    return this.disputesService.getDisputeById(disputeId);
  }

  @Post(':disputeId/resolve')
  // Marks a dispute as resolved using the admin's decision.
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
  // Escalates a dispute for further review.
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
