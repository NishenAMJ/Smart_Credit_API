import { Module, Logger } from '@nestjs/common';
import { FirebaseModule } from '../../firebase/firebase.module';
import { LoanRequestsModule } from '../lender/loan-requests/loan-requests.module';
import { LenderRequestsController } from './lender_requests.controller';
import { LenderRequestsService } from './lender_requests.service';
import { LenderRemindersController } from './lender_reminders.controller';
import { LenderRemindersService } from './lender_reminders.service';

@Module({
  imports: [FirebaseModule, LoanRequestsModule],
  controllers: [
    LenderRequestsController,
    LenderRemindersController,
  ],
  providers: [
    Logger,
    LenderRequestsService,
    LenderRemindersService,
  ],
  exports: [
    LenderRequestsService,
    LenderRemindersService,
  ],
})
export class LenderMobileModule {}
