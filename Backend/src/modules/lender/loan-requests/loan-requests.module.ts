import { Module } from '@nestjs/common';
import { FirebaseModule } from '../../../firebase/firebase.module';
import { AuthModule } from '../../auth/auth.module';
import { LoanRequestsController } from './loan-requests.controller';
import { LoanRequestsService } from './loan-requests.service';

@Module({
  imports: [AuthModule, FirebaseModule],
  controllers: [LoanRequestsController],
  providers: [LoanRequestsService],
})
export class LoanRequestsModule {}
