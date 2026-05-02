import { Module } from '@nestjs/common';
import { KycController } from './kyc.controller';
import { KycMobileController } from './kyc-mobile.controller';
import { KycService } from './kyc.service';
import { FirebaseModule } from '../../firebase/firebase.module';
import { AuthModule } from '../admin/admin-auth/auth.module';

@Module({
  imports: [FirebaseModule, AuthModule],
  controllers: [KycController, KycMobileController],
  providers: [KycService],
})
export class KycModule {}
