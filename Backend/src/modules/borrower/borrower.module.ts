import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { BorrowerController } from './borrower.controller';
import { BorrowerService } from './borrower.service';
import { BorrowerApplicationsService } from './borrower-applications.service';
import { BorrowerDashboardService } from './borrower-dashboard.service';
import { BorrowerSupportService } from './borrower-support.service';
import { CreditScoreService } from './credit-score.service';
import { FirebaseModule } from '../../firebase/firebase.module';

/**
 * Registers borrower HTTP routes and business services.
 */
@Module({
  imports: [
    FirebaseModule,
    JwtModule.register({
      secret: process.env.QR_SECRET || 'dev-insecure-qr-secret',
      signOptions: { expiresIn: '5m' },
    }),
  ],
  controllers: [BorrowerController],
  providers: [
    BorrowerService,
    BorrowerApplicationsService,
    BorrowerDashboardService,
    BorrowerSupportService,
    CreditScoreService,
  ],
  exports: [
    BorrowerService,
    BorrowerApplicationsService,
    BorrowerDashboardService,
    BorrowerSupportService,
    CreditScoreService,
  ],
})
export class BorrowerModule {}
