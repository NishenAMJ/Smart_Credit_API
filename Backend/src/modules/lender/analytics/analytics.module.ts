import { Module } from '@nestjs/common';
import { FirebaseModule } from '../../../firebase/firebase.module';
import { AnalyticsController } from './analytics.controller';
import { AnalyticsService } from './analytics.service';

@Module({
  imports: [FirebaseModule],
  controllers: [AnalyticsController],
  providers: [AnalyticsService],
})
export class AnalyticsModule {}
