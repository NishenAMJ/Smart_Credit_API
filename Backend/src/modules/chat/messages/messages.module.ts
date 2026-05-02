import { Module } from '@nestjs/common';
import { MulterModule } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'path';
import { v4 as uuidv4 } from 'uuid';
import { MessagesController } from './messages.controller';
import { MessagesService } from './messages.service';
import { ConversationsModule } from '../conversations/conversations.module';

@Module({
  imports: [
    ConversationsModule,
    MulterModule.register({
      storage: diskStorage({
        destination: process.env.UPLOAD_DEST ?? './uploads',
        filename: (_req, file, cb) => {
          cb(null, `${uuidv4()}${extname(file.originalname)}`);
        },
      }),
      limits: {
        fileSize:
          parseInt(process.env.MAX_FILE_SIZE_MB ?? '10', 10) * 1024 * 1024,
      },
      fileFilter: (_req, file, cb) => {
        const allowed = /jpeg|jpg|png|gif|webp|mp4|mov|pdf|doc|docx|txt/;
        const ext = extname(file.originalname).toLowerCase().replace('.', '');
        cb(null, allowed.test(ext));
      },
    }),
  ],
  controllers: [MessagesController],
  providers: [MessagesService],
  exports: [MessagesService],
})
export class MessagesModule {}