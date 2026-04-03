import { Module, Logger } from '@nestjs/common';

import { LenderMobileController } from './lender_mobile.controller';
import { LenderMobileService } from './lender_mobile.service';
import { LenderApplicationsController } from './lender_applications.controller';
import { LenderApplicationsService } from './lender_applications.service';

@Module({
  controllers: [LenderMobileController, LenderApplicationsController],
  providers: [
    LenderMobileService,
    LenderApplicationsService,
    Logger,
  ],
  exports: [LenderMobileService, LenderApplicationsService], // allows reuse in other modules if needed
})
export class LenderMobileModule {}