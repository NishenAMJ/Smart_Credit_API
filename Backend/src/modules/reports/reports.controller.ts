import { Controller, Get, UseGuards } from '@nestjs/common';
import { ReportsService } from './reports.service';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';

@Controller('admin')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin')
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Get('reports/users')
  async getUsersReport() {
    return this.reportsService.getUsersReport();
  }

  @Get('reports/loans')
  async getLoansReport() {
    return this.reportsService.getLoansReport();
  }

  @Get('reports/transactions')
  async getTransactionsReport() {
    return this.reportsService.getTransactionsReport();
  }

  @Get('reports/revenue')
  async getRevenueReport() {
    return this.reportsService.getRevenueReport();
  }

  @Get('analytics/dashboard')
  async getDashboardAnalytics() {
    return this.reportsService.getDashboardAnalytics();
  }
}
