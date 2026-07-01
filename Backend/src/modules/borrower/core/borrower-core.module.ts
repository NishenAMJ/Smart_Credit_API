import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { FirebaseModule } from '../../../firebase/firebase.module';
import { BorrowerCreditScoreModule } from '../credit-score/credit-score.module';
import { BorrowerService } from './borrower.service';

@Module({
  imports: [
    FirebaseModule,
    BorrowerCreditScoreModule,
    JwtModule.register({
      secret: process.env.QR_SECRET || 'dev-insecure-qr-secret',
      signOptions: { expiresIn: '5m' },
    }),
  ],
  providers: [BorrowerService],
  exports: [BorrowerService],
})
export class BorrowerCoreModule {}

