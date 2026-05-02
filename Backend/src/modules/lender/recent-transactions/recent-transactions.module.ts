import { Module } from '@nestjs/common';
import { FirebaseModule } from '../../../firebase/firebase.module';
import { AuthModule } from '../../auth/auth.module';
import { RecentTransactionsController } from './recent-transactions.controller';
import { RecentTransactionsService } from './recent-transactions.service';

@Module({
  imports: [FirebaseModule, AuthModule],
  controllers: [RecentTransactionsController],
  providers: [RecentTransactionsService],
  exports: [RecentTransactionsService],
})
export class RecentTransactionsModule {}
