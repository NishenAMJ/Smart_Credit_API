import { Module } from '@nestjs/common';
import { FirebaseModule } from '../firebase/firebase.module';
import { DashboardController } from './dashboard.controller';
import { DashboardService } from './dashboard.service';

@Module({
  imports: [FirebaseModule],
  controllers: [DashboardController],
  providers: [DashboardService],
})
export class DashboardModule {}
