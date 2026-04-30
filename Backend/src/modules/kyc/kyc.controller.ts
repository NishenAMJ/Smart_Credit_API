import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import type { AuthenticatedRequest } from '../../common/types/authenticated-request';
import { KycService } from './kyc.service';
import { SubmitKycDto, UpdateKycStatusDto } from './dto/kyc.dto';

@Controller('kyc')
export class KycController {
  constructor(private readonly kycService: KycService) {}

  @Post('submit')
  @UseGuards(JwtAuthGuard)
  async submitKyc(
    @Req() req: AuthenticatedRequest,
    @Body() submitKycDto: SubmitKycDto,
  ) {
    const result = await this.kycService.submitKyc(req.user.sub, submitKycDto);
    return {
      message: 'KYC submission received successfully. Status will be updated after review.',
      submission: result,
    };
  }

  @Get('my-submission')
  @UseGuards(JwtAuthGuard)
  async getMyKycSubmission(@Req() req: AuthenticatedRequest) {
    const submission = await this.kycService.getUserKycSubmission(req.user.sub);
    return {
      submission,
    };
  }

  @Get('submissions')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  async getAllSubmissions() {
    const submissions = await this.kycService.getAllKycSubmissions();
    return {
      submissions,
    };
  }

  @Get('submissions/:status')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  async getSubmissionsByStatus(@Param('status') status: string) {
    const submissions = await this.kycService.getKycSubmissionsByStatus(status as any);
    return {
      submissions,
    };
  }

  @Patch('submissions/:id/status')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  async updateKycStatus(
    @Param('id') submissionId: string,
    @Body() updateDto: UpdateKycStatusDto,
    @Req() req: AuthenticatedRequest,
  ) {
    const result = await this.kycService.updateKycStatus(
      submissionId,
      updateDto,
      req.user.sub,
    );
    return {
      message: `KYC submission ${updateDto.status}`,
      submission: result,
    };
  }
}
