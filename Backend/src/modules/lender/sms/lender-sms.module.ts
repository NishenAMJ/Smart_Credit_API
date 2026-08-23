import { Module } from '@nestjs/common';
import { FirebaseModule } from '../../../firebase/firebase.module';
import { AuthModule } from '../../auth/auth.module';
import { LenderSmsController } from './lender-sms.controller';
import { LenderSmsService } from './lender-sms.service';
import { SMS_PROVIDER } from './providers/sms-provider';
import { TextlkSmsProvider } from './providers/textlk-sms.provider';
import { PaymentReceivedSmsService } from './payment-received-sms.service';
import { PAYMENT_RECEIVED_NOTIFIER } from '../shared/payment-received-notifier.port';

@Module({
  imports: [AuthModule, FirebaseModule],
  controllers: [LenderSmsController],
  providers: [
    TextlkSmsProvider,
    { provide: SMS_PROVIDER, useExisting: TextlkSmsProvider },
    PaymentReceivedSmsService,
    {
      provide: PAYMENT_RECEIVED_NOTIFIER,
      useExisting: PaymentReceivedSmsService,
    },
    LenderSmsService,
  ],
  exports: [LenderSmsService, PAYMENT_RECEIVED_NOTIFIER],
})
export class LenderSmsModule {}
