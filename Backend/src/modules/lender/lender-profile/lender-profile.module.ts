import { Module } from '@nestjs/common';
import { FirebaseModule } from '../../../firebase/firebase.module';
import { LenderProfileController } from './lender-profile.controller';
import { LenderProfileService } from './lender-profile.service';

@Module({
  imports: [FirebaseModule],
  controllers: [LenderProfileController],
  providers: [LenderProfileService],
})
export class LenderProfileModule {}
