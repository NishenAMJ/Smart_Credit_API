import { Module } from '@nestjs/common';
import { FirebaseModule } from '../../../firebase/firebase.module';
import { RecentTransactionsController } from './recent-transactions.controller';
import { RecentTransactionsService } from './recent-transactions.service';

@Module({
  imports: [FirebaseModule],
  controllers: [RecentTransactionsController],
  providers: [RecentTransactionsService],
})
export class RecentTransactionsModule {}
