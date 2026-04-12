import { Module } from '@nestjs/common';
import { AdsController } from './ads.controller';
import { AdsService } from './ads.service';
import { FirebaseModule } from '../../firebase/firebase.module';
import { AuthModule } from '../admin/admin-auth/auth.module';

@Module({
  imports: [FirebaseModule, AuthModule],
  controllers: [AdsController],
  providers: [AdsService],
  exports: [AdsService],
})
export class AdsModule {}
