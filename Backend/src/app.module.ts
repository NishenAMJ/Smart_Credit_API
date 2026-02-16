import { Module } from '@nestjs/common';
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
  
})
export class AppModule {}
