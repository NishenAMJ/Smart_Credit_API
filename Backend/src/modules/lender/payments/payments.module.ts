import { Module } from '@nestjs/common';
import { FirebaseModule } from '../../../firebase/firebase.module';
import { AuthModule } from '../../auth/auth.module';
import { PaymentsController } from './payments.controller';
import { InstallmentPaymentService } from './installment-payment.service';
import { PaymentLedgerDetailsService } from './payment-ledger-details.service';
import { PaymentsDataService } from './payments-data.service';
import { PaymentsService } from './payments.service';

@Module({
  imports: [FirebaseModule, AuthModule],
  controllers: [PaymentsController],
  providers: [
    PaymentsService,
    InstallmentPaymentService,
    PaymentLedgerDetailsService,
    PaymentsDataService,
  ],
  exports: [PaymentsService],
})
export class PaymentsModule {}
