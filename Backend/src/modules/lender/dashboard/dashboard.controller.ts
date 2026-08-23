import {
  Controller,
  DefaultValuePipe,
  Get,
  NotFoundException,
  Param,
  ParseIntPipe,
  Query,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import type { Response } from 'express';
import type { AuthenticatedRequest } from '../../../common/types/authenticated-request';
import { Roles } from '../../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { DashboardBorrowersExportService } from './dashboard-borrowers-export.service';
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
  constructor(
    private readonly dashboardService: DashboardService,
    private readonly borrowersExportService: DashboardBorrowersExportService,
  ) {}

  @Get('summary')
  getSummary(
    @Req() request: AuthenticatedRequest,
  ): Promise<DashboardSummaryResponse> {
    return this.dashboardService.getSummary(request.user.sub);
  }

  @Get('borrowers')
  getBorrowers(
    @Req() request: AuthenticatedRequest,
    @Query('pageSize', new DefaultValuePipe(8), ParseIntPipe) pageSize: number,
    @Query('cursor') cursor?: string,
    @Query('limit') limit?: string,
  ): Promise<DashboardBorrowersResponse> {
    return this.dashboardService.getBorrowers(
      request.user.sub,
      Number.isFinite(Number(limit)) ? Number(limit) : pageSize,
      cursor?.trim() || null,
    );
  }

  @Get('borrowers/export')
  async exportBorrowers(
    @Req() req: AuthenticatedRequest,
    @Res({ passthrough: true }) response: Response,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ): Promise<string> {
    const result = await this.borrowersExportService.createCsv(
      req.user.sub,
      startDate?.trim() || null,
      endDate?.trim() || null,
    );

    response.setHeader('Content-Type', 'text/csv; charset=utf-8');
    response.setHeader(
      'Content-Disposition',
      `attachment; filename="${result.fileName}"`,
    );
    response.setHeader('X-Export-Record-Count', String(result.recordCount));
    return result.csv;
  }

  @Get('borrowers/:id')
  async getBorrowerDetails(
    @Req() request: AuthenticatedRequest,
    @Param('id') id: string,
  ): Promise<BorrowerDetailsResponse> {
    const borrower = await this.dashboardService.getBorrowerDetails(
      request.user.sub,
      id,
    );

    if (!borrower) {
      throw new NotFoundException(`Borrower ${id} was not found.`);
    }

    return borrower;
  }
}
