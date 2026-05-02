import { Module } from '@nestjs/common';
import { FirebaseModule } from '../../../firebase/firebase.module';
import { AuthModule } from '../../auth/auth.module';
import { LenderNotificationsController } from './lender-notifications.controller';
import { LenderNotificationsService } from './lender-notifications.service';

@Module({
  imports: [FirebaseModule, AuthModule],
  controllers: [LenderNotificationsController],
  providers: [LenderNotificationsService],
  exports: [LenderNotificationsService],
})
export class LenderNotificationsModule {}
