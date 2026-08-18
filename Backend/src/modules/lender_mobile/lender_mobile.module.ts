import { Module, Logger } from '@nestjs/common';
import { FirebaseModule } from '../../firebase/firebase.module';
import { LenderAdsModule } from '../lender/lender-ads/lender-ads.module';
import { LoanRequestsModule } from '../lender/loan-requests/loan-requests.module';

import { LenderMobileController } from './lender_mobile.controller';
import { LenderMobileService } from './lender_mobile.service';
import { LenderBorrowersController } from './lender_borrowers.controller';
import { LenderBorrowersService } from './lender_borrowers.service';
import { LenderOffersController } from './lender_offers.controller';
import { LenderOffersService } from './lender_offers.service';
import { LenderRequestsController } from './lender_requests.controller';
import { LenderRequestsService } from './lender_requests.service';
import { LenderRemindersController } from './lender_reminders.controller';
import { LenderRemindersService } from './lender_reminders.service';

@Module({
  imports: [FirebaseModule, LenderAdsModule, LoanRequestsModule],
  controllers: [
    LenderMobileController,
    LenderBorrowersController,
    LenderOffersController,
    LenderRequestsController,
    LenderRemindersController,
  ],
  providers: [
    Logger,
    LenderMobileService,
    LenderBorrowersService,
    LenderOffersService,
    LenderRequestsService,
    LenderRemindersService,
  ],
  exports: [
    LenderMobileService,
    LenderOffersService,
    LenderRequestsService,
    LenderRemindersService,
  ],
})
export class LenderMobileModule {}
