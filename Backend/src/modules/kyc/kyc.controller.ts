import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  Query,
  HttpCode,
  HttpStatus,
  UseGuards,
} from '@nestjs/common';
import { KycService } from './kyc.service';
import { ApproveKycDto } from './dto/approve-kyc.dto';
import { RejectKycDto } from './dto/reject-kyc.dto';
import { AdminJwtGuard } from '../admin/admin-auth/guards/admin-jwt.guard';

@Controller('admin/kyc')
@UseGuards(AdminJwtGuard)
export class KycController {
  constructor(private readonly kycService: KycService) {}

  @Get('pending')
  async getPendingKyc(@Query('limit') limit?: string, @Query('cursor') cursor?: string) {
    return this.kycService.getPendingKyc(limit, cursor);
  }

  @Get(':userId/documents')
  async getUserDocuments(@Param('userId') userId: string) {
    return this.kycService.getUserDocuments(userId);
  }

  @Post(':documentId/approve')
  @HttpCode(HttpStatus.OK)
  async approveDocument(
    @Param('documentId') documentId: string,
    @Body() dto: ApproveKycDto,
  ) {
    return this.kycService.approveDocument(documentId, dto.notes);
  }

  @Post(':documentId/reject')
  @HttpCode(HttpStatus.OK)
  async rejectDocument(
    @Param('documentId') documentId: string,
    @Body() dto: RejectKycDto,
  ) {
    return this.kycService.rejectDocument(documentId, dto.reason);
  }
}
