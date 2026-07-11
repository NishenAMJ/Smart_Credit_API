import { Module } from '@nestjs/common';
import { KycController } from './kyc.controller';
import { KycMobileController } from './kyc-mobile.controller';
import { KycService } from './kyc.service';
import { FirebaseModule } from '../../firebase/firebase.module';
import { AuthModule } from '../auth/auth.module';
import { DocumentsModule } from '../documents/documents.module';
import { MediaModule } from '../media/media.module';

@Module({
  imports: [FirebaseModule, AuthModule, DocumentsModule, MediaModule],
  controllers: [KycController, KycMobileController],
  providers: [KycService],
})
export class KycModule {}
