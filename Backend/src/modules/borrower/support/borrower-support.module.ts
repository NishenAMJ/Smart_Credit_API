import { Module } from '@nestjs/common';
import { BorrowerSupportController } from './borrower-support.controller';
import { BorrowerSupportService } from './borrower-support.service';

@Module({
  controllers: [BorrowerSupportController],
  providers: [BorrowerSupportService],
  exports: [BorrowerSupportService],
})
export class BorrowerSupportModule {}
