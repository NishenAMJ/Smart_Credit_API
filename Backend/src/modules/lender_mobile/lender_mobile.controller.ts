import {
  Controller,
  Get,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { LenderMobileService } from './lender_mobile.service';

@Controller('api/lender/dashboard')
export class LenderMobileController {
  private readonly logger = new Logger(LenderMobileController.name);

  constructor(
    private readonly lenderMobileService: LenderMobileService,
  ) {}

  @Get()
  async getDashboard() {
    try {
      this.logger.log('Fetching lender dashboard data');

      const data = await this.lenderMobileService.getDashboard();

      this.logger.debug('Dashboard data fetched successfully');

      return {
        success: true,
        message: 'Dashboard data retrieved successfully',
        data,
      };
    } catch (error) {
      this.logger.error(
        'Error while fetching dashboard data',
        error.stack,
      );

      throw new InternalServerErrorException(
        'Failed to load dashboard data',
      );
    }
  }

  @Get('summary')
  async getDashboardSummary() {
    try {
      this.logger.log('Fetching lender dashboard summary');

      const data =
        await this.lenderMobileService.getDashboardSummary();

      this.logger.debug('Dashboard summary fetched successfully');

      return {
        success: true,
        message: 'Dashboard summary retrieved successfully',
        data,
      };
    } catch (error) {
      this.logger.error(
        'Error while fetching dashboard summary',
        error.stack,
      );

      throw new InternalServerErrorException(
        'Failed to load dashboard summary',
      );
    }
  }

  @Get('stats')
  async getDashboardStats() {
    try {
      this.logger.log('Fetching lender dashboard statistics');

      const data =
        await this.lenderMobileService.getDashboardStats();

      this.logger.debug('Dashboard statistics fetched successfully');

      return {
        success: true,
        message: 'Dashboard statistics retrieved successfully',
        data,
      };
    } catch (error) {
      this.logger.error(
        'Error while fetching dashboard statistics',
        error.stack,
      );

      throw new InternalServerErrorException(
        'Failed to load dashboard statistics',
      );
    }
  }
}