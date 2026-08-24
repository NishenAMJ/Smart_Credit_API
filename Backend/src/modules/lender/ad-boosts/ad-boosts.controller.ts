import {
  Body,
  Controller,
  Get,
  Header,
  Param,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import type { Request } from 'express';
import type { AuthenticatedRequest } from '../../../common/types/authenticated-request';
import { Roles } from '../../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { AdBoostsService } from './ad-boosts.service';
import { CreateAdBoostDto, SubmitAdBoostReceiptDto } from './ad-boosts.dto';

@Controller('lender-ad-boosts')
export class AdBoostsController {
  constructor(private readonly service: AdBoostsService) {}

  @Get('plans')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('lender')
  getPlans() {
    return this.service.getPlans();
  }

  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('lender')
  list(@Req() request: AuthenticatedRequest) {
    return this.service.listForLender(request.user.sub);
  }

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('lender')
  create(
    @Req() request: AuthenticatedRequest & Request,
    @Body() body: CreateAdBoostDto,
  ) {
    return this.service.createBoost(request.user.sub, {
      ...body,
      requestBaseUrl: this.requestBaseUrl(request),
    });
  }

  @Post(':boostId/receipt')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('lender')
  submitReceipt(
    @Req() request: AuthenticatedRequest,
    @Param('boostId') boostId: string,
    @Body() body: SubmitAdBoostReceiptDto,
  ) {
    return this.service.submitBankReceipt(request.user.sub, boostId, body);
  }

  @Get('payhere/checkout/:orderId')
  @Header('Content-Type', 'text/html')
  checkout(@Param('orderId') orderId: string) {
    return this.service.renderCheckout(orderId);
  }

  @Get('payhere/result/:status')
  @Header('Content-Type', 'text/html')
  result(@Param('status') status: string) {
    return this.service.renderResult(status === 'success');
  }

  @Post('payhere/notify')
  notify(@Body() body: Record<string, string>) {
    return this.service.handlePayHereNotification(body);
  }

  private requestBaseUrl(request: Request) {
    const protocol =
      request.get('x-forwarded-proto')?.split(',')[0]?.trim() ||
      request.protocol;
    const host =
      request.get('x-forwarded-host')?.split(',')[0]?.trim() ||
      request.get('host');
    return `${protocol}://${host}`;
  }
}
