import { Module } from '@nestjs/common';

import { FirebaseModule } from '../../firebase/firebase.module';
import { DocumentsService } from './documents.service';

@Module({
  imports: [FirebaseModule],
  providers: [DocumentsService],
  exports: [DocumentsService],
})
export class DocumentsModule {}
