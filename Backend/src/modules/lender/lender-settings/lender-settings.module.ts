import { Module } from '@nestjs/common';
import { FirebaseModule } from '../firebase/firebase.module';
import { LenderSettingsController } from './lender-settings.controller';
import { LenderSettingsService } from './lender-settings.service';

@Module({
  imports: [FirebaseModule],
  controllers: [LenderSettingsController],
  providers: [LenderSettingsService],
})
export class LenderSettingsModule {}
