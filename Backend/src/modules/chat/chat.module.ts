// Chat module handles real-time messaging between users
// Includes conversations, messages, user presence, blocking, and WebSocket gateway

import { Module } from '@nestjs/common';
import { FirebaseModule } from '../../firebase/firebase.module';
import { ConversationsModule } from './conversations/conversations.module';
import { MessagesModule } from './messages/messages.module';
import { UsersModule } from './users/users.module';
import { BlocksModule } from './users/blocks.module';
import { GatewayModule } from './gateway/gateway.module';

// ✅ FIXED: previously listed raw providers (ChatGateway, ConversationsService, etc.)
// which bypasses NestJS DI scoping and causes injection errors.
// Now we import the proper feature modules which export their services correctly.
@Module({
  imports: [
    FirebaseModule,
    ConversationsModule,
    MessagesModule,
    UsersModule,
    BlocksModule,
    GatewayModule,
  ],
  exports: [
    ConversationsModule,
    MessagesModule,
    UsersModule,
    BlocksModule,
    GatewayModule,
  ],
})
export class ChatModule {}