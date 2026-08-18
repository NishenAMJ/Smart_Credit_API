import { Module } from '@nestjs/common';
import { FirebaseModule } from '../../../firebase/firebase.module';
import { AuthModule } from '../../auth/auth.module';
import { LoanRequestsController } from './loan-requests.controller';
import { LoanRequestsService } from './loan-requests.service';
import { CoreLedgerModule } from '../../core-ledger/core-ledger.module';

@Module({
  imports: [AuthModule, FirebaseModule, CoreLedgerModule],
  controllers: [LoanRequestsController],
  providers: [LoanRequestsService],
  exports: [LoanRequestsService],
})
export class LoanRequestsModule {}
