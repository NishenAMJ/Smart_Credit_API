import { Module } from '@nestjs/common';
import { FirebaseModule } from '../../../firebase/firebase.module';
import { AuthModule } from '../../auth/auth.module';
import { LenderNotificationsModule } from '../lender-notifications/lender-notifications.module';
import { LenderAdsController } from './lender-ads.controller';
import { LenderAdsService } from './lender-ads.service';

@Module({
  imports: [FirebaseModule, AuthModule, LenderNotificationsModule],
  controllers: [LenderAdsController],
  providers: [LenderAdsService],
  exports: [LenderAdsService],
})
export class LenderAdsModule {}
