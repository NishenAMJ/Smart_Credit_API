
// ✅ FIXED: This file was previously a copy-paste of WsExceptionFilter.
// It is now a proper NestJS module that registers ChatGateway and imports
// all services the gateway depends on.

import { Module } from '@nestjs/common';
import { ChatGateway } from './chat.gateway';
import { ConversationsModule } from '../conversations/conversations.module';
import { MessagesModule } from '../messages/messages.module';
import { BlocksModule } from '../users/blocks.module';
import { UsersModule } from '../users/users.module';

@Module({
  imports: [
    ConversationsModule,
    MessagesModule,
    BlocksModule,
    UsersModule,
  ],
  providers: [ChatGateway],
  exports: [ChatGateway],
})
export class GatewayModule {}

/*This file is used to handle errors that happen
 during WebSocket communication in the chat system.
  Instead of letting the application crash or show
   unclear errors, it catches those errors, logs them 
   for debugging, and sends a simple error message back 
   to the client. This helps keep the real-time chat stable and 
   ensures users get proper feedback when something goes wrong.*/
