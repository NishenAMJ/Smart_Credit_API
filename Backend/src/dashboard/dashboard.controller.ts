import {
  Controller,
  DefaultValuePipe,
  Get,
  NotFoundException,
  Param,
  ParseIntPipe,
  Query,
} from '@nestjs/common';
import { DashboardService } from './dashboard.service';
import {
  BorrowerDetailsResponse,
  DashboardOverviewResponse,
} from './dashboard.types';

@Controller('dashboard')
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get('overview')
  getOverview(
    @Query('limit', new DefaultValuePipe(24), ParseIntPipe) limit: number,
  ): Promise<DashboardOverviewResponse> {
    return this.dashboardService.getOverview(limit);
  }

  @Get('borrowers/:id')
  async getBorrowerDetails(
    @Param('id') id: string,
  ): Promise<BorrowerDetailsResponse> {
    const borrower = await this.dashboardService.getBorrowerDetails(id);

    if (!borrower) {
      throw new NotFoundException(`Borrower ${id} was not found.`);
    }

    return borrower;
  }
}
