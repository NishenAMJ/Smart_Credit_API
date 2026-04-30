import { Module } from '@nestjs/common';
import { FirebaseModule } from '../../firebase/firebase.module';
import { LenderController } from './lender.controller';
import { LenderService } from './lender.service';

@Module({
  imports: [FirebaseModule],
  controllers: [LenderController],
  providers: [LenderService],
})
export class LenderModule {}
