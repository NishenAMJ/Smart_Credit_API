import { Module, Logger } from '@nestjs/common';
import { FirebaseModule } from '../../firebase/firebase.module';

import { LenderMobileController } from './lender_mobile.controller';
import { LenderMobileService } from './lender_mobile.service';

import { LenderApplicationsController } from './lender_applications.controller';
import { LenderApplicationsService } from './lender_applications.service';

import { LenderBorrowersController } from './lender_borrowers.controller';
import { LenderBorrowersService } from './lender_borrowers.service';

import { LenderOffersController } from './lender_offers.controller';
import { LenderOffersService } from './lender_offers.service';

import { LenderRequestsController } from './lender_requests.controller';
import { LenderRequestsService } from './lender_requests.service';

import { LenderRemindersController } from './lender_reminders.controller';
import { LenderRemindersService } from './lender_reminders.service';

@Module({
  imports: [FirebaseModule],
  controllers: [
    LenderMobileController,
    LenderApplicationsController,
    LenderBorrowersController,
    LenderOffersController,
    LenderRequestsController,
    LenderRemindersController,
  ],
  providers: [
    Logger,
    LenderMobileService,
    LenderApplicationsService,
    LenderBorrowersService,
    LenderOffersService,
    LenderRequestsService,
    LenderRemindersService,
  ],
  exports: [
    LenderMobileService,
    LenderApplicationsService,
    LenderOffersService,
    LenderRequestsService,
    LenderRemindersService,
  ],
})
export class LenderMobileModule {}