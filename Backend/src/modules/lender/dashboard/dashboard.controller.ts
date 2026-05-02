import {
  Controller,
  DefaultValuePipe,
  Get,
  NotFoundException,
  Param,
  ParseIntPipe,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import type { AuthenticatedRequest } from '../../../common/types/authenticated-request';
import { Roles } from '../../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { DashboardService } from './dashboard.service';
import {
  BorrowerDetailsResponse,
  DashboardBorrowersResponse,
  DashboardSummaryResponse,
} from './dashboard.types';

@Controller('dashboard')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('lender')
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get('summary')
  getSummary(
    @Req() req: AuthenticatedRequest,
  ): Promise<DashboardSummaryResponse> {
    return this.dashboardService.getSummary(req.user.sub);
  }

  @Get('borrowers')
  getBorrowers(
    @Req() req: AuthenticatedRequest,
    @Query('pageSize', new DefaultValuePipe(8), ParseIntPipe) pageSize: number,
    @Query('cursor') cursor?: string,
    @Query('search') search?: string,
    @Query('limit') limit?: string,
  ): Promise<DashboardBorrowersResponse> {
    return this.dashboardService.getBorrowers(
      req.user.sub,
      Number.isFinite(Number(limit)) ? Number(limit) : pageSize,
      cursor?.trim() || null,
      search?.trim() || null,
    );
  }

  @Get('borrowers/:id')
  async getBorrowerDetails(
    @Req() req: AuthenticatedRequest,
    @Param('id') id: string,
  ): Promise<BorrowerDetailsResponse> {
    const borrower = await this.dashboardService.getBorrowerDetails(
      req.user.sub,
      id,
    );

    if (!borrower) {
      throw new NotFoundException(`Borrower ${id} was not found.`);
    }

    return borrower;
  }
}
