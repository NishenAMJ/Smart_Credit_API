import { Module } from '@nestjs/common';

import { FirebaseModule } from '../../firebase/firebase.module';
import { MediaModule } from '../media/media.module';
import { AuthModule } from '../auth/auth.module';
import { DocumentsService } from './documents.service';
import { DocumentsController } from './documents.controller';

@Module({
  imports: [FirebaseModule, MediaModule, AuthModule],
  controllers: [DocumentsController],
  providers: [DocumentsService],
  exports: [DocumentsService],
})
export class DocumentsModule {}
