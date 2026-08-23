import { Module } from '@nestjs/common';
import { FirebaseModule } from '../../../firebase/firebase.module';
import { LenderNotificationsController } from './lender-notifications.controller';
import { LenderNotificationDraftFactory } from './lender-notification-draft.factory';
import { LenderNotificationSyncDataService } from './lender-notification-sync-data.service';
import { LenderNotificationWriterService } from './lender-notification-writer.service';
import { LenderNotificationSyncService } from './lender-notification-sync.service';
import { LenderNotificationsService } from './lender-notifications.service';

@Module({
  imports: [FirebaseModule],
  controllers: [LenderNotificationsController],
  providers: [
    LenderNotificationsService,
    LenderNotificationSyncService,
    LenderNotificationSyncDataService,
    LenderNotificationDraftFactory,
    LenderNotificationWriterService,
  ],
  exports: [LenderNotificationWriterService],
})
export class LenderNotificationsModule {}
