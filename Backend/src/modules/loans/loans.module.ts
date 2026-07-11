// modules/loans/loans.module.ts
import { Module } from '@nestjs/common';
import { LoansController } from './loans.controller';
import { LoansService } from './loans.service';
import { FirebaseModule } from '../../firebase/firebase.module';
import { LegalModule } from '../legal/legal.module';

@Module({
  imports: [FirebaseModule, LegalModule],
  controllers: [LoansController],
  providers: [LoansService],
  exports: [LoansService],
})
export class LoansModule {}
