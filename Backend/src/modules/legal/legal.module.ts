import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { MediaModule } from '../media/media.module';
import { DocumentsModule } from '../documents/documents.module';
import { LegalController } from './legal.controller';
import { LegalService } from './legal.service';

@Module({
  imports: [AuthModule, MediaModule, DocumentsModule],
  controllers: [LegalController],
  providers: [LegalService],
  exports: [LegalService],
})
export class LegalModule {}
