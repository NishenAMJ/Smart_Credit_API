import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { FirebaseModule } from '../../firebase/firebase.module';
import { KycController } from './kyc.controller';
import { KycMobileController } from './kyc-mobile.controller';
import { KycService } from './kyc.service';

@Module({
  imports: [AuthModule, FirebaseModule],
  controllers: [KycController, KycMobileController],
  providers: [KycService],
  exports: [KycService],
})
export class KycModule {}
