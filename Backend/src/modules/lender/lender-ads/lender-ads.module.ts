import { Module } from '@nestjs/common';
import { FirebaseModule } from '../../../firebase/firebase.module';
import { LenderNotificationsModule } from '../lender-notifications/lender-notifications.module';
import { LenderAdsController } from './lender-ads.controller';
import { LenderAdsService } from './lender-ads.service';
import { LenderAdAnalyticsService } from './lender-ad-analytics.service';

@Module({
  imports: [FirebaseModule, LenderNotificationsModule],
  controllers: [LenderAdsController],
  providers: [LenderAdsService, LenderAdAnalyticsService],
  exports: [LenderAdsService, LenderAdAnalyticsService],
})
export class LenderAdsModule {}
