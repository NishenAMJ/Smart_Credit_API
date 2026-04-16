import { Module } from '@nestjs/common';
import { LenderController } from './lender.controller';
import { LenderService } from './lender.service';

@Module({
  controllers: [LenderController],
  providers: [LenderService]
})
export class LenderModule {}
