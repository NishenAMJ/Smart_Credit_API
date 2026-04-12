import { Module } from '@nestjs/common';
import { KycController } from './kyc.controller';
import { KycService } from './kyc.service';
import { FirebaseModule } from '../../firebase/firebase.module';
import { AuthModule } from '../admin/admin-auth/auth.module';

@Module({
  imports: [FirebaseModule, AuthModule],
  controllers: [KycController],
  providers: [KycService],
})
export class KycModule {}
