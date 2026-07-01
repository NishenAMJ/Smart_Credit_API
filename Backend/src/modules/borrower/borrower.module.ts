import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { BorrowerService } from './borrower.service';
import { BorrowerApplicationsModule } from './applications/borrower-applications.module';
import { BorrowerDashboardModule } from './dashboard/borrower-dashboard.module';
import { BorrowerNotificationsModule } from './notifications/borrower-notifications.module';
import { BorrowerSupportModule } from './support/borrower-support.module';
import { BorrowerCreditScoreModule } from './credit-score/credit-score.module';
import { BorrowerProfileController } from './profile/borrower-profile.controller';
import { BorrowerProfileService } from './profile/borrower-profile.service';
import { BorrowerLoansController } from './loans/borrower-loans.controller';
import { BorrowerLoansService } from './loans/borrower-loans.service';
import { BorrowerPaymentsController } from './payments/borrower-payments.controller';
import { BorrowerPaymentsService } from './payments/borrower-payments.service';
import { FirebaseModule } from '../../firebase/firebase.module';

/**
 * Registers borrower HTTP routes and business services.
 */
@Module({
  imports: [
    FirebaseModule,
    BorrowerApplicationsModule,
    BorrowerDashboardModule,
    BorrowerNotificationsModule,
    BorrowerSupportModule,
    BorrowerCreditScoreModule,
    JwtModule.register({
      secret: process.env.QR_SECRET || 'dev-insecure-qr-secret',
      signOptions: { expiresIn: '5m' },
    }),
  ],
  controllers: [
    BorrowerProfileController,
    BorrowerLoansController,
    BorrowerPaymentsController,
  ],
  providers: [
    BorrowerService,
    BorrowerProfileService,
    BorrowerLoansService,
    BorrowerPaymentsService,
  ],
  exports: [
    BorrowerService,
    BorrowerApplicationsModule,
    BorrowerDashboardModule,
    BorrowerNotificationsModule,
    BorrowerSupportModule,
    BorrowerCreditScoreModule,
  ],
})
export class BorrowerModule {}
