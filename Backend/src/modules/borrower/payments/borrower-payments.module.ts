import { Module } from '@nestjs/common';
import { BorrowerCoreModule } from '../core/borrower-core.module';
import { BorrowerPaymentsController } from './borrower-payments.controller';
import { BorrowerPaymentsService } from './borrower-payments.service';
import { CoreLedgerModule } from '../../core-ledger/core-ledger.module';

@Module({
  imports: [BorrowerCoreModule, CoreLedgerModule],
  controllers: [BorrowerPaymentsController],
  providers: [BorrowerPaymentsService],
  exports: [BorrowerPaymentsService],
})
export class BorrowerPaymentsModule {}
