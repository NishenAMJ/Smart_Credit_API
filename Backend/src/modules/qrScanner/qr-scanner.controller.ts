import {
  Controller,
  Post,
  Body,
  UseGuards,
  BadRequestException,
  Param,
  Get,
  Req,
} from '@nestjs/common';
import { QrScannerService } from './qr-scanner.service';
import { ScanPaymentSlipDto } from './dto/scan-payment-slip.dto';
import { QrScanResponse } from './interfaces/qr-scan-response.interface';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import type { AuthenticatedRequest } from '../../common/types/authenticated-request';

@Controller('lender-mobile/qr-scanner')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('lender')
export class QrScannerController {
  constructor(private readonly qrScannerService: QrScannerService) {}

  /**
   * POST /lender-mobile/qr-scanner/scan-payment
   * Process QR code scan from payment slip
   * Lender scans QR code from payment slip -> borrower marked as payment done
   * @param scanData QR scan data with loan and payment details
   * @param userId Lender ID (from JWT)
   * @returns Payment processing result
   */
  @Post('scan-payment')
  async scanPaymentSlip(
    @Body() scanData: ScanPaymentSlipDto,
    @Req() req: AuthenticatedRequest,
  ): Promise<QrScanResponse> {
    const userId = req?.user?.sub;

    if (!userId) {
      throw new BadRequestException('User ID not found in token');
    }

    return this.qrScannerService.processPaymentSlipScan(scanData, userId);
  }

  /**
   * GET /lender-mobile/qr-scanner/payment-history/:loanId
   * Fetch payment transaction history for a loan
   * @param loanId Loan ID
   * @param limit Number of records to fetch (default: 10)
   * @returns Payment history
   */
  @Get('payment-history/:loanId')
  async getPaymentHistory(
    @Param('loanId') loanId: string,
    @Body('limit') limit?: number,
  ) {
    return this.qrScannerService.getPaymentHistory(loanId, limit);
  }

  /**
   * POST /lender-mobile/qr-scanner/validate-qr
   * Validate and parse QR code data structure
   * @param qrData Raw QR code string
   * @returns Parsed payment slip data
   */
  @Post('validate-qr')
  async validateQrCode(@Body('qrData') qrData: string) {
    if (!qrData) {
      throw new BadRequestException('QR data is required');
    }

    return this.qrScannerService.validateAndParseQrData(qrData);
  }
}
