import { Module } from '@nestjs/common';
import { BorrowerCoreModule } from '../core/borrower-core.module';
import { BorrowerLoansController } from './borrower-loans.controller';
import { BorrowerLoansService } from './borrower-loans.service';

@Module({
  imports: [BorrowerCoreModule],
  controllers: [BorrowerLoansController],
  providers: [BorrowerLoansService],
  exports: [BorrowerLoansService],
})
export class BorrowerLoansModule {}

