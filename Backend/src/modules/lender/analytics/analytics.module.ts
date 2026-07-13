import { Module } from '@nestjs/common';
import { FirebaseModule } from '../../../firebase/firebase.module';
import { AnalyticsController } from './analytics.controller';
import { AnalyticsDataService } from './analytics-data.service';
import { AnalyticsDrilldownService } from './analytics-drilldown.service';
import { AnalyticsService } from './analytics.service';

@Module({
  imports: [FirebaseModule],
  controllers: [AnalyticsController],
  providers: [
    AnalyticsService,
    AnalyticsDataService,
    AnalyticsDrilldownService,
  ],
})
export class AnalyticsModule {}
