import { Body, Controller, Get, Param, Post, Req, UseGuards } from '@nestjs/common';
import { KycService } from './kyc.service';
import { SubmitKycDto } from './dto/submit-kyc.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import type { AuthenticatedRequest } from '../../common/types/authenticated-request';

@Controller('kyc')
export class KycMobileController {
  constructor(private readonly kycService: KycService) {}

  @Post('submit')
  async submit(@Body() dto: SubmitKycDto) {
    return this.kycService.submitMobileKyc(dto);
  }

  @Get('documents')
  @UseGuards(JwtAuthGuard)
  async listMyDocuments(@Req() req: AuthenticatedRequest) {
    return this.kycService.getUserDocuments(req.user.sub);
  }

  @Get('documents/:documentId/access')
  @UseGuards(JwtAuthGuard)
  async getDocumentAccessUrl(
    @Param('documentId') documentId: string,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.kycService.getSignedDocumentAccessUrl(
      documentId,
      req.user.sub,
      req.user.role,
    );
  }
}
