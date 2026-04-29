import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AnalyticsModule } from './modules/lender/analytics/analytics.module';
import { FirebaseModule } from './firebase/firebase.module';
import { DashboardModule } from './modules/lender/dashboard/dashboard.module';
import { LenderAdsModule } from './modules/lender/lender-ads/lender-ads.module';
import { LenderNotificationsModule } from './modules/lender/lender-notifications/lender-notifications.module';
import { LenderProfileModule } from './modules/lender/lender-profile/lender-profile.module';
import { LenderSettingsModule } from './modules/lender/lender-settings/lender-settings.module';
import { LoanRequestsModule } from './modules/lender/loan-requests/loan-requests.module';
import { RecentTransactionsModule } from './modules/lender/recent-transactions/recent-transactions.module';

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
