import { Module } from '@nestjs/common';
import { BorrowerCoreModule } from './core/borrower-core.module';
import { BorrowerApplicationsModule } from './applications/borrower-applications.module';
import { BorrowerDashboardModule } from './dashboard/borrower-dashboard.module';
import { BorrowerNotificationsModule } from './notifications/borrower-notifications.module';
import { BorrowerSupportModule } from './support/borrower-support.module';
import { BorrowerCreditScoreModule } from './credit-score/credit-score.module';
import { BorrowerProfileModule } from './profile/borrower-profile.module';
import { BorrowerLoansModule } from './loans/borrower-loans.module';
import { BorrowerPaymentsModule } from './payments/borrower-payments.module';

/**
 * Registers borrower HTTP routes and business services.
 */
@Module({
  imports: [
    BorrowerCoreModule,
    BorrowerApplicationsModule,
    BorrowerDashboardModule,
    BorrowerNotificationsModule,
    BorrowerSupportModule,
    BorrowerCreditScoreModule,
    BorrowerProfileModule,
    BorrowerLoansModule,
    BorrowerPaymentsModule,
  ],
  controllers: [],
  providers: [],
  exports: [
    BorrowerCoreModule,
    BorrowerApplicationsModule,
    BorrowerDashboardModule,
    BorrowerNotificationsModule,
    BorrowerSupportModule,
    BorrowerCreditScoreModule,
    BorrowerProfileModule,
    BorrowerLoansModule,
    BorrowerPaymentsModule,
  ],
})
export class BorrowerModule {}

