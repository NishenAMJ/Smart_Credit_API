import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { FirebaseModule } from './firebase/firebase.module';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule as AdminAuthModule } from './modules/admin/admin-auth/auth.module';
import { AuthModule as MobileAuthModule } from './modules/auth/auth.module';
import { BorrowerModule } from './modules/borrower/borrower.module';
import { LenderModule } from './modules/lender/lender.module';
import { AdminModule } from './modules/admin/admin.module';
import { LegalModule } from './modules/legal/legal.module';
import { TransactionsModule } from './modules/transactions/transactions.module';
import { ChatModule } from './modules/chat/chat.module';
import { KycModule } from './modules/kyc/kyc.module';
import { AdsModule } from './modules/ads/ads.module';
import { DisputesModule } from './modules/disputes/disputes.module';
import { ReportsModule } from './modules/reports/reports.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    FirebaseModule,
    AdminAuthModule,
    MobileAuthModule,
    BorrowerModule,
    LenderModule,
    AdminModule,
    LegalModule,
    TransactionsModule,
    ChatModule,
    KycModule,
    AdsModule,
    DisputesModule,
    ReportsModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
