import { Module } from '@nestjs/common';
import { FirebaseModule } from '../../../firebase/firebase.module';
import { AuthModule } from '../../auth/auth.module';
import { LenderLoansController } from './lender-loans.controller';
import { LenderLoansService } from './lender-loans.service';

@Module({
  imports: [FirebaseModule, AuthModule],
  controllers: [LenderLoansController],
  providers: [LenderLoansService],
})
export class LenderLoansModule {}
