import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AnalyticsModule } from './analytics/analytics.module';
import { FirebaseModule } from './firebase/firebase.module';
import { DashboardModule } from './dashboard/dashboard.module';
import { LenderAdsModule } from './lender-ads/lender-ads.module';
import { LenderNotificationsModule } from './lender-notifications/lender-notifications.module';
import { LenderProfileModule } from './lender-profile/lender-profile.module';
import { LenderSettingsModule } from './lender-settings/lender-settings.module';
import { LoanRequestsModule } from './loan-requests/loan-requests.module';
import { RecentTransactionsModule } from './recent-transactions/recent-transactions.module';

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
    LenderNotificationsModule,
    LenderProfileModule,
    LenderSettingsModule,
    LoanRequestsModule,
    RecentTransactionsModule,
  ],
  controllers: [], // We can remove AppController if not needed
  providers: [], // We can remove AppService if not needed
})
export class AppModule {}
