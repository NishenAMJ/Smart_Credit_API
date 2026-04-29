import { Module } from '@nestjs/common';
import { FirebaseModule } from '../../../firebase/firebase.module';
import { LoanRequestsController } from './loan-requests.controller';
import { LoanRequestsService } from './loan-requests.service';

@Module({
  imports: [FirebaseModule],
  controllers: [LoanRequestsController],
  providers: [LoanRequestsService],
})
export class LoanRequestsModule {}
