import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { FirebaseModule } from './firebase/firebase.module';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './modules/auth/auth.module';
import { BorrowerModule } from './modules/borrower/borrower.module';
import { LenderModule } from './modules/lender/lender.module';
import { AdminModule } from './modules/admin/admin.module';
import { LegalModule } from './modules/legal/legal.module';
import { TransactionsModule } from './modules/transactions/transactions.module';
import { ChatModule } from './modules/chat/chat.module';
import { KycModule } from './modules/kyc/kyc.module';
import { LoansModule } from './modules/loans/loans.module';
import { AdvertisementModule } from './modules/advertisement/advertisement.module';
import { LenderMobileModule } from './modules/lender_mobile/lender_mobile.module';

// ── Lender sub-modules (each has its own controller + Firebase service) ──────
import { DashboardModule } from './modules/lender/dashboard/dashboard.module';
import { AnalyticsModule } from './modules/lender/analytics/analytics.module';
import { LoanRequestsModule } from './modules/lender/loan-requests/loan-requests.module';
import { RecentTransactionsModule } from './modules/lender/recent-transactions/recent-transactions.module';
import { LenderProfileModule } from './modules/lender/lender-profile/lender-profile.module';

@Module({
  imports: [
    // 1. Load environment variables globally
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    // 2. Firebase
    FirebaseModule,
    // 3. Feature modules
    AuthModule,
    BorrowerModule,
    LenderModule,
    AdminModule,
    LegalModule,
    TransactionsModule,
    ChatModule,
    KycModule,
    LoansModule,
    LenderMobileModule,
    AdvertisementModule,
    // 4. Lender sub-modules (routes: /api/dashboard/*, /api/analytics/*, etc.)
    DashboardModule,
    AnalyticsModule,
    LoanRequestsModule,
    RecentTransactionsModule,
    LenderProfileModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
