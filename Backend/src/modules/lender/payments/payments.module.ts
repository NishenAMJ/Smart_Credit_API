import { Module } from '@nestjs/common';
import { FirebaseModule } from '../../../firebase/firebase.module';
import { AuthModule } from '../../auth/auth.module';
import { PaymentsController } from './payments.controller';
import { InstallmentPaymentService } from './installment-payment.service';
import { PaymentLedgerDetailsService } from './payment-ledger-details.service';
import { PaymentsDataService } from './payments-data.service';
import { PaymentsService } from './payments.service';
import { PaymentsExportService } from './payments-export.service';
import { LenderSmsModule } from '../sms/lender-sms.module';
import { ReceiptVerificationService } from './receipt-verification.service';

@Module({
  imports: [FirebaseModule, AuthModule, LenderSmsModule],
  controllers: [PaymentsController],
  providers: [
    PaymentsService,
    InstallmentPaymentService,
    PaymentLedgerDetailsService,
    PaymentsDataService,
    PaymentsExportService,
    ReceiptVerificationService,
  ],
  exports: [PaymentsService, InstallmentPaymentService],
})
export class PaymentsModule {}
