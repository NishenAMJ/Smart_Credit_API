import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import { MediaService } from './media.service';

@Module({
  imports: [ConfigModule],
  providers: [MediaService],
  exports: [MediaService],
})
export class MediaModule {}
