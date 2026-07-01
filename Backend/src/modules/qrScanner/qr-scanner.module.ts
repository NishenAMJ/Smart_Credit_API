import { Module } from '@nestjs/common';
import { QrScannerController } from './qr-scanner.controller';
import { QrScannerService } from './qr-scanner.service';
import { FirebaseModule } from '../../firebase/firebase.module';

@Module({
  imports: [FirebaseModule],
  controllers: [QrScannerController],
  providers: [QrScannerService],
  exports: [QrScannerService],
})
export class QrScannerModule {}
