import { Module } from '@nestjs/common';
import { FirebaseModule } from '../../../firebase/firebase.module';
import { BorrowerCreditScoreModule } from '../credit-score/credit-score.module';
import { AuthModule } from '../../auth/auth.module';
import { BorrowerApplicationsController } from './borrower-applications.controller';
import { BorrowerApplicationsService } from './borrower-applications.service';

@Module({
  imports: [AuthModule, FirebaseModule, BorrowerCreditScoreModule],
  controllers: [BorrowerApplicationsController],
  providers: [BorrowerApplicationsService],
  exports: [BorrowerApplicationsService],
})
export class BorrowerApplicationsModule {}
