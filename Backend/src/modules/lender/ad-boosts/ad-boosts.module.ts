import { Module } from '@nestjs/common';
import { FirebaseModule } from '../../../firebase/firebase.module';
import { LenderNotificationsModule } from '../lender-notifications/lender-notifications.module';
import { AdBoostsController } from './ad-boosts.controller';
import { AdminAdBoostsController } from './admin-ad-boosts.controller';
import { AdBoostsService } from './ad-boosts.service';

@Module({
  imports: [FirebaseModule, LenderNotificationsModule],
  controllers: [AdBoostsController, AdminAdBoostsController],
  providers: [AdBoostsService],
  exports: [AdBoostsService],
})
export class AdBoostsModule {}
