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

@Module({
  imports: [
    // 1. Load environment variables globally
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    // 2. Import your custom Firebase module
    FirebaseModule,
    // 3. Import feature modules
    AuthModule,
    BorrowerModule,
    LenderModule,
    AdminModule,
    LegalModule,
    TransactionsModule,
    ChatModule,
    KycModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
