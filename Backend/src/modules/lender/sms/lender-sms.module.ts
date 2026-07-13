import { Module } from '@nestjs/common';
import { FirebaseModule } from '../../../firebase/firebase.module';
import { AuthModule } from '../../auth/auth.module';
import { LenderSmsController } from './lender-sms.controller';
import { LenderSmsService } from './lender-sms.service';

@Module({
  imports: [AuthModule, FirebaseModule],
  controllers: [LenderSmsController],
  providers: [LenderSmsService],
  exports: [LenderSmsService],
})
export class LenderSmsModule {}
