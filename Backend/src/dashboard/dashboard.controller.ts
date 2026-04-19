import {
  BadRequestException,
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
    @Query('lenderId') lenderId: string | undefined,
    @Query('limit', new DefaultValuePipe(24), ParseIntPipe) limit: number,
  ): Promise<DashboardOverviewResponse> {
    if (!lenderId?.trim()) {
      throw new BadRequestException('lenderId is required.');
    }

    return this.dashboardService.getOverview(lenderId.trim(), limit);
  }

  @Get('borrowers/:id')
  async getBorrowerDetails(
    @Param('id') id: string,
    @Query('lenderId') lenderId: string | undefined,
  ): Promise<BorrowerDetailsResponse> {
    if (!lenderId?.trim()) {
      throw new BadRequestException('lenderId is required.');
    }

    const borrower = await this.dashboardService.getBorrowerDetails(
      lenderId.trim(),
      id,
    );

    if (!borrower) {
      throw new NotFoundException(`Borrower ${id} was not found.`);
    }

    return borrower;
  }
}
