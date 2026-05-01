import { Module } from '@nestjs/common';
import { FirebaseModule } from '../firebase/firebase.module';
import { LenderNotificationsController } from './lender-notifications.controller';
import { LenderNotificationsService } from './lender-notifications.service';

@Module({
  imports: [FirebaseModule],
  controllers: [LenderNotificationsController],
  providers: [LenderNotificationsService],
  exports: [LenderNotificationsService],
})
export class LenderNotificationsModule {}
