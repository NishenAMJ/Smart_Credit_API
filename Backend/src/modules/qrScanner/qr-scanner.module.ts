import { Module } from '@nestjs/common';
import { QrScannerController } from './qr-scanner.controller';
import { QrScannerService } from './qr-scanner.service';
import { FirebaseModule } from '../../firebase/firebase.module';
import { BorrowerCoreModule } from '../borrower/core/borrower-core.module';
import { PaymentsModule } from '../lender/payments/payments.module';

@Module({
  imports: [FirebaseModule, BorrowerCoreModule, PaymentsModule],
  controllers: [QrScannerController],
  providers: [QrScannerService],
  exports: [QrScannerService],
})
export class QrScannerModule {}
