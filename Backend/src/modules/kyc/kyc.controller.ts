import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  Query,
  Req,
  HttpCode,
  HttpStatus,
  UseGuards,
} from '@nestjs/common';
import { KycService } from './kyc.service';
import { ApproveKycDto } from './dto/approve-kyc.dto';
import { RejectKycDto } from './dto/reject-kyc.dto';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import type { AuthenticatedRequest } from '../../common/types/authenticated-request';

@Controller('admin/kyc')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin')
export class KycController {
  constructor(private readonly kycService: KycService) {}

  // Returns paginated KYC documents that admins still need to review.
  @Get('pending')
  async getPendingKyc(
    @Query('limit') limit?: string,
    @Query('cursor') cursor?: string,
  ) {
    return this.kycService.getPendingKyc(limit, cursor);
  }

  // Lets admins inspect every uploaded KYC document for a single user.
  @Get(':userId/documents')
  async getUserDocuments(@Param('userId') userId: string) {
    return this.kycService.getUserDocuments(userId);
  }

  // Approves one KYC document and updates the user's overall KYC status.
  @Post(':documentId/approve')
  @HttpCode(HttpStatus.OK)
  async approveDocument(
    @Param('documentId') documentId: string,
    @Body() dto: ApproveKycDto,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.kycService.approveDocument(documentId, req.user.sub, dto.notes);
  }

  // Rejects one KYC document and stores the admin's rejection reason.
  @Post(':documentId/reject')
  @HttpCode(HttpStatus.OK)
  async rejectDocument(
    @Param('documentId') documentId: string,
    @Body() dto: RejectKycDto,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.kycService.rejectDocument(documentId, dto.reason, req.user.sub);
  }
}
