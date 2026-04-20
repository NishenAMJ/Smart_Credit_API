import { Module } from '@nestjs/common';
import { FirebaseModule } from '../firebase/firebase.module';
import { LenderAdsController } from './lender-ads.controller';
import { LenderAdsService } from './lender-ads.service';

@Module({
  imports: [FirebaseModule],
  controllers: [LenderAdsController],
  providers: [LenderAdsService],
})
export class LenderAdsModule {}
