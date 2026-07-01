import { Module } from '@nestjs/common';
import { FirebaseModule } from '../../../firebase/firebase.module';
import { BorrowerDashboardController } from './borrower-dashboard.controller';
import { BorrowerDashboardService } from './borrower-dashboard.service';

@Module({
  imports: [FirebaseModule],
  controllers: [BorrowerDashboardController],
  providers: [BorrowerDashboardService],
  exports: [BorrowerDashboardService],
})
export class BorrowerDashboardModule {}
