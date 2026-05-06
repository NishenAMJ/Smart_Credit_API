
import { Module } from '@nestjs/common';
import { ConversationsModule } from './conversations/conversations.module';
import { MessagesModule } from './messages/messages.module';
import { UsersModule } from './users/users.module';
import { BlocksModule } from './users/blocks.module';
import { GatewayModule } from './gateway/gateway.module';

@Module({
  imports: [
    ConversationsModule, // REST: list/create/delete conversations
    MessagesModule, // REST: initial message fetch for first install / re-install
    UsersModule, // REST: user search, FCM token update, presence
    BlocksModule, // REST: block/unblock users
    GatewayModule, // WebSocket: real-time message routing
  ],
  exports: [
    ConversationsModule,
    MessagesModule,
    UsersModule,
    BlocksModule,
    GatewayModule,
  ],
})
export class ChatModule { }
