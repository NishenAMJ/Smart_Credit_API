// Messages module handles all message-related features in the chat app
// Includes sending messages and uploading media files

import { Module } from '@nestjs/common';
import { MulterModule } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'path';
import { v4 as uuidv4 } from 'uuid';

import { MessagesController } from './messages.controller';
import { MessagesService } from './messages.service';
import { ConversationsModule } from '../conversations/conversations.module';

// Defines the Messages module
@Module({
  imports: [
    // Import ConversationsModule to access conversation-related logic
    ConversationsModule,

    // Configure file upload handling using Multer
    MulterModule.register({
      storage: diskStorage({
        // Where uploaded files are stored on the server
        destination: process.env.UPLOAD_DEST ?? './uploads',

        // Generate unique filename for each uploaded file
        filename: (_req, file, cb) => {
          cb(null, `${uuidv4()}${extname(file.originalname)}`);
        },
      }),

      // Limit file size to prevent large uploads
      limits: {
        fileSize:
          parseInt(process.env.MAX_FILE_SIZE_MB ?? '10', 10) *
          1024 *
          1024,
      },

      // Filter allowed file types (security + control)
      fileFilter: (_req, file, cb) => {
        const allowed = /jpeg|jpg|png|gif|webp|mp4|mov|pdf|doc|docx|txt/;

        // Extract file extension
        const ext = extname(file.originalname)
          .toLowerCase()
          .replace('.', '');

        // Allow file only if it matches allowed types
        cb(null, allowed.test(ext));
      },
    }),
  ],

  // Controllers that handle incoming HTTP requests
  controllers: [MessagesController],

  // Services that contain business logic
  providers: [MessagesService],

  // Export service so other modules can use it
  exports: [MessagesService],
})
export class MessagesModule {}