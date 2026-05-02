import { Body, Controller, Post } from '@nestjs/common';
import { KycService } from './kyc.service';
import { SubmitKycDto } from './dto/submit-kyc.dto';

@Controller('mobile/kyc')
export class KycMobileController {
  constructor(private readonly kycService: KycService) {}

  @Post('submit')
  async submit(@Body() dto: SubmitKycDto) {
    return this.kycService.submitMobileKyc(dto);
  }
}
