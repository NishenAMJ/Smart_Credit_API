import { Controller, Get, Param, Post, Body, NotFoundException } from '@nestjs/common';
import { LenderApplicationsService } from './lender_applications.service';
import type { Application } from './lender_applications.service';

@Controller('api/lender/applications')
export class LenderApplicationsController {
  constructor(private readonly applicationsService: LenderApplicationsService) {}

  @Get()

  getAllApplications(): Application[] {
    return this.applicationsService.getAllApplications();
  }

  @Get('pending')

  getPendingApplications(): Application[] {
    return this.applicationsService.getPendingApplications();
  }

  @Get(':applicationId')

  getApplicationById(@Param('applicationId') applicationId: string): Application {
    const app = this.applicationsService.getApplicationById(applicationId);
    if (!app) throw new NotFoundException('Application not found');
    return app;
  }

  @Post(':applicationId/approve')

  approveApplication(@Param('applicationId') applicationId: string): any {
    return this.applicationsService.approveApplication(applicationId);
  }

  @Post(':applicationId/reject')

  rejectApplication(@Param('applicationId') applicationId: string, @Body('reason') reason: string): any {
    return this.applicationsService.rejectApplication(applicationId, reason);
  }
}
