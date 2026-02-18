// modules/borrower/borrower.module.ts
import { Module } from '@nestjs/common';
import { BorrowerController } from './borrower.controller';
import { BorrowerService } from './borrower.service';
import { FirebaseModule } from '../../firebase/firebase.module';
import { LoansModule } from '../loans/loans.module';

@Module({
  imports: [FirebaseModule, LoansModule],
  controllers: [BorrowerController],
  providers: [BorrowerService],
  exports: [BorrowerService],
})
export class BorrowerModule {}
