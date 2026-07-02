import { Module } from '@nestjs/common';
import { FirebaseModule } from '../../../firebase/firebase.module';
import { AuthModule } from '../../auth/auth.module';
import { LenderSettingsController } from './lender-settings.controller';
import { LenderSettingsService } from './lender-settings.service';

@Module({
  imports: [FirebaseModule, AuthModule],
  controllers: [LenderSettingsController],
  providers: [LenderSettingsService],
  exports: [LenderSettingsService],
})
export class LenderSettingsModule {}
