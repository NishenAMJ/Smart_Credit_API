import {
  Controller,
  Get,
  Param,
  Post,
  Body,
  NotFoundException,
} from '@nestjs/common';
import { LenderApplicationsService } from './lender_applications.service';
import type {
  Application,
  ApplicationDecision,
} from './lender_applications.service';

@Controller('lender/applications')
export class LenderApplicationsController {
  constructor(
    private readonly applicationsService: LenderApplicationsService,
  ) {}

  @Get()
  getAllApplications(): Application[] {
    return this.applicationsService.getAllApplications();
  }

  @Get('pending')
  getPendingApplications(): Application[] {
    return this.applicationsService.getPendingApplications();
  }

  @Get(':applicationId')
  getApplicationById(
    @Param('applicationId') applicationId: string,
  ): Application {
    const application =
      this.applicationsService.getApplicationById(applicationId);

    if (!application) {
      throw new NotFoundException('Application not found');
    }

    return application;
  }

  @Post(':applicationId/approve')
  approveApplication(
    @Param('applicationId') applicationId: string,
  ): ApplicationDecision {
    return this.applicationsService.approveApplication(applicationId);
  }

  @Post(':applicationId/reject')
  rejectApplication(
    @Param('applicationId') applicationId: string,
    @Body('reason') reason: string,
  ): ApplicationDecision {
    return this.applicationsService.rejectApplication(applicationId, reason);
  }
}
