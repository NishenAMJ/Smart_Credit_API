import { Module } from '@nestjs/common';
import { FirebaseModule } from '../../../firebase/firebase.module';
import { AuthModule } from '../../auth/auth.module';
import { LenderProfileController } from './lender-profile.controller';
import { LenderProfileService } from './lender-profile.service';

@Module({
  imports: [FirebaseModule, AuthModule],
  controllers: [LenderProfileController],
  providers: [LenderProfileService],
  exports: [LenderProfileService],
})
export class LenderProfileModule {}
