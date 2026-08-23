import { Module } from '@nestjs/common';
import { FirebaseModule } from '../../../firebase/firebase.module';
import { AuthModule } from '../../auth/auth.module';
import { DashboardBorrowersExportService } from './dashboard-borrowers-export.service';
import { DashboardController } from './dashboard.controller';
import { DashboardSummaryService } from './dashboard-summary.service';
import { DashboardService } from './dashboard.service';

@Module({
  imports: [FirebaseModule, AuthModule],
  controllers: [DashboardController],
  providers: [
    DashboardService,
    DashboardSummaryService,
    DashboardBorrowersExportService,
  ],
})
export class DashboardModule {}
