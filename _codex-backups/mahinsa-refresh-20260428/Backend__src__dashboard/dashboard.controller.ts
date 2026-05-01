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
  DashboardBorrowersResponse,
  DashboardSummaryResponse,
} from './dashboard.types';

@Controller('dashboard')
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get('summary')
  getSummary(
    @Query('lenderId') lenderId: string | undefined,
  ): Promise<DashboardSummaryResponse> {
    if (!lenderId?.trim()) {
      throw new BadRequestException('lenderId is required.');
    }

    return this.dashboardService.getSummary(lenderId.trim());
  }

  @Get('borrowers')
  getBorrowers(
    @Query('lenderId') lenderId: string | undefined,
    @Query('limit', new DefaultValuePipe(24), ParseIntPipe) limit: number,
  ): Promise<DashboardBorrowersResponse> {
    if (!lenderId?.trim()) {
      throw new BadRequestException('lenderId is required.');
    }

    return this.dashboardService.getBorrowers(lenderId.trim(), limit);
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
