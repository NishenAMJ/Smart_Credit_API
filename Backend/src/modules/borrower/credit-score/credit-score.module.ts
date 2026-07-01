import { Module } from '@nestjs/common';
import { FirebaseModule } from '../../../firebase/firebase.module';
import { CreditScoreController } from './credit-score.controller';
import { CreditScoreService } from './credit-score.service';

@Module({
  imports: [FirebaseModule],
  controllers: [CreditScoreController],
  providers: [CreditScoreService],
  exports: [CreditScoreService],
})
export class BorrowerCreditScoreModule {}

