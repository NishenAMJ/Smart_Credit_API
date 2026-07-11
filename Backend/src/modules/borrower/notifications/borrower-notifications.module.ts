import { Module } from '@nestjs/common';
import { FirebaseModule } from '../../../firebase/firebase.module';
import { BorrowerNotificationsController } from './borrower-notifications.controller';
import { BorrowerNotificationsService } from './borrower-notifications.service';

@Module({
  imports: [FirebaseModule],
  controllers: [BorrowerNotificationsController],
  providers: [BorrowerNotificationsService],
  exports: [BorrowerNotificationsService],
})
export class BorrowerNotificationsModule {}

