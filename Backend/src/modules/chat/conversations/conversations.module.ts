import { Module } from '@nestjs/common';
import { ConversationsController } from './conversations.controller';
import { ConversationsService } from './conversations.service';

@Module({
  controllers: [ConversationsController],
  providers: [ConversationsService],
  exports: [ConversationsService],
})
export class ConversationsModule {}

// controllers - registers ConversationsController (handles routes)
// providers - registers ConversationsService (logic + db operations)
// exports - allows other modules to use ConversationsService