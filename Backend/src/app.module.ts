import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AnalyticsModule } from './analytics/analytics.module';
import { FirebaseModule } from './firebase/firebase.module';
import { DashboardModule } from './dashboard/dashboard.module';
import { LenderAdsModule } from './lender-ads/lender-ads.module';
import { LenderProfileModule } from './lender-profile/lender-profile.module';
import { LoanRequestsModule } from './loan-requests/loan-requests.module';

@Module({
  imports: [
    // Load .env file globally
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env', // make sure .env is in backend root
    }),
    // Our Firebase connection
    FirebaseModule,
    // Dashboard feature
    DashboardModule,
    AnalyticsModule,
    LenderAdsModule,
    LenderProfileModule,
    LoanRequestsModule,
  ],
  controllers: [], // We can remove AppController if not needed
  providers: [], // We can remove AppService if not needed
})
export class AppModule {}
