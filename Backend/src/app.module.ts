import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { FirebaseModule } from './firebase/firebase.module';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './modules/auth/auth.module';
import { BorrowerModule } from './modules/borrower/borrower.module';
import { AnalyticsModule } from './modules/lender/analytics/analytics.module';
import { DashboardModule } from './modules/lender/dashboard/dashboard.module';
import { LenderAdsModule } from './modules/lender/lender-ads/lender-ads.module';
import { LenderNotificationsModule } from './modules/lender/lender-notifications/lender-notifications.module';
import { LenderProfileModule } from './modules/lender/lender-profile/lender-profile.module';
import { LenderSettingsModule } from './modules/lender/lender-settings/lender-settings.module';
import { LoanRequestsModule } from './modules/lender/loan-requests/loan-requests.module';
import { RecentTransactionsModule } from './modules/lender/recent-transactions/recent-transactions.module';
import { AdminModule } from './modules/admin/admin.module';
import { LegalModule } from './modules/legal/legal.module';
import { TransactionsModule } from './modules/transactions/transactions.module';
import { ChatModule } from './modules/chat/chat.module';
import { KycModule } from './modules/kyc/kyc.module';
import { LoansModule } from './modules/loans/loans.module';
import { LenderMobileModule } from './modules/lender_mobile/lender_mobile.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    FirebaseModule,
    AuthModule,
    BorrowerModule,
    DashboardModule,
    AnalyticsModule,
    LenderAdsModule,
    LenderNotificationsModule,
    LenderProfileModule,
    LenderSettingsModule,
    LoanRequestsModule,
    RecentTransactionsModule,
    AdminModule,
    LegalModule,
    TransactionsModule,
    ChatModule,
    KycModule,
    LoansModule,
    LenderMobileModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
