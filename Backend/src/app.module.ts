import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { join } from 'node:path';
import { CoreLedgerModule } from './modules/core-ledger/core-ledger.module';
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
import { LenderSmsModule } from './modules/lender/sms/lender-sms.module';
import { LoanRequestsModule } from './modules/lender/loan-requests/loan-requests.module';
import { PaymentsModule } from './modules/lender/payments/payments.module';
import { LenderLoansModule } from './modules/lender/loans/lender-loans.module';
import { AdminModule } from './modules/admin/admin.module';
import { LegalModule } from './modules/legal/legal.module';
import { TransactionsModule } from './modules/transactions/transactions.module';
import { ChatModule } from './modules/chat/chat.module';

import { KycModule } from './modules/kyc/kyc.module';
import { LoansModule } from './modules/loans/loans.module';
import { LenderMobileModule } from './modules/lender_mobile/lender_mobile.module';
import { ReportsModule } from './modules/reports/reports.module';
import { DisputesModule } from './modules/disputes/disputes.module';
import { QrScannerModule } from './modules/qrScanner/qr-scanner.module';
import { LocationModule } from './modules/location/location.module';
import { AiAssistantModule } from './modules/ai-assistant/ai-assistant.module';
import { AdminQueryCacheModule } from './common/cache/admin-query-cache.module';
import { AdBoostsModule } from './modules/lender/ad-boosts/ad-boosts.module';
import { RoleNotificationModule } from './common/notifications/role-notification.module';
import { PayHereModule } from './common/payhere/payhere.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: [
        join(process.cwd(), 'Backend', '.env'),
        join(process.cwd(), '.env'),
      ],
    }),
    AdminQueryCacheModule,
    CoreLedgerModule,
    FirebaseModule,
    RoleNotificationModule,
    PayHereModule,
    AuthModule,
    BorrowerModule,
    DashboardModule,
    AnalyticsModule,
    LenderAdsModule,
    AdBoostsModule,
    LenderNotificationsModule,
    LenderProfileModule,
    LenderSettingsModule,
    LenderSmsModule,
    LoanRequestsModule,
    PaymentsModule,
    LenderLoansModule,
    AdminModule,
    LegalModule,
    TransactionsModule,
    ChatModule,
    KycModule,
    LoansModule,
    LenderMobileModule,
    ReportsModule,
    DisputesModule,
    QrScannerModule,
    LocationModule,
    AiAssistantModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
