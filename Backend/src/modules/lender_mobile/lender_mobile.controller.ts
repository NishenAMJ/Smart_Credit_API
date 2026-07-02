import {
  Controller,
  Get,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { LenderMobileService } from './lender_mobile.service';

@Controller('lender-mobile/dashboard')
export class LenderMobileController {
  private readonly logger = new Logger(LenderMobileController.name);

  constructor(private readonly lenderMobileService: LenderMobileService) {}

  @Get()
  getDashboard() {
    try {
      this.logger.log('Fetching lender dashboard data');

      const data = this.lenderMobileService.getDashboard();

      this.logger.debug('Dashboard data fetched successfully');

      return {
        success: true,
        message: 'Dashboard data retrieved successfully',
        data,
      };
    } catch (error) {
      this.logger.error(
        'Error while fetching dashboard data',
        this.getErrorStack(error),
      );

      throw new InternalServerErrorException('Failed to load dashboard data');
    }
  }

  @Get('summary')
  getDashboardSummary() {
    try {
      this.logger.log('Fetching lender dashboard summary');

      const data = this.lenderMobileService.getDashboardSummary();

      this.logger.debug('Dashboard summary fetched successfully');

      return {
        success: true,
        message: 'Dashboard summary retrieved successfully',
        data,
      };
    } catch (error) {
      this.logger.error(
        'Error while fetching dashboard summary',
        this.getErrorStack(error),
      );

      throw new InternalServerErrorException(
        'Failed to load dashboard summary',
      );
    }
  }

  @Get('stats')
  getDashboardStats() {
    try {
      this.logger.log('Fetching lender dashboard statistics');

      const data = this.lenderMobileService.getDashboardStats();

      this.logger.debug('Dashboard statistics fetched successfully');

      return {
        success: true,
        message: 'Dashboard statistics retrieved successfully',
        data,
      };
    } catch (error) {
      this.logger.error(
        'Error while fetching dashboard statistics',
        this.getErrorStack(error),
      );

      throw new InternalServerErrorException(
        'Failed to load dashboard statistics',
      );
    }
  }

  private getErrorStack(error: unknown): string {
    return error instanceof Error
      ? (error.stack ?? error.message)
      : String(error);
  }
}
