// Chat module handles real-time messaging between users
// Includes conversations, messages, user presence, blocking, and WebSocket gateway

import { Module } from '@nestjs/common';
import { FirebaseModule } from './config/firebase.module';
import { ChatGateway } from './gateway/chat.gateway';
import { ConversationsService } from './conversations/conversations.service';
import { MessagesService } from './messages/messages.service';
import { UsersService } from './users/users.service';
import { BlocksService } from './users/blocks.service';

@Module({
  imports: [FirebaseModule],
  providers: [
    ChatGateway,
    ConversationsService,
    MessagesService,
    UsersService,
    BlocksService,
  ],
  // Export services so other modules can use them
  exports: [
    ChatGateway,
    ConversationsService,
    MessagesService,
    UsersService,
    BlocksService,
  ],
})
export class ChatModule {}