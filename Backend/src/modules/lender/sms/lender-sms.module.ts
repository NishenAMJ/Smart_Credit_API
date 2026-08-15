import { Module } from '@nestjs/common';
import { FirebaseModule } from '../../../firebase/firebase.module';
import { AuthModule } from '../../auth/auth.module';
import { LenderSmsController } from './lender-sms.controller';
import { LenderSmsService } from './lender-sms.service';
import { SMS_PROVIDER } from './providers/sms-provider';
import { TextlkSmsProvider } from './providers/textlk-sms.provider';

@Module({
  imports: [AuthModule, FirebaseModule],
  controllers: [LenderSmsController],
  providers: [
    TextlkSmsProvider,
    { provide: SMS_PROVIDER, useExisting: TextlkSmsProvider },
    LenderSmsService,
  ],
  exports: [LenderSmsService],
})
export class LenderSmsModule {}
