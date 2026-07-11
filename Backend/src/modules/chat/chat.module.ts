import { Module } from '@nestjs/common';
import { ConversationsModule } from './conversations/conversations.module';
import { MessagesModule } from './messages/messages.module';
import { UsersModule } from './users/users.module';
import { BlocksModule } from './users/blocks.module';
import { GatewayModule } from './gateway/gateway.module';

/**
 * ChatModule — root module for all chat features.
 *
 * FirebaseModule is @Global() so it does not need to be imported here.
 * AuthModule is imported inside each sub-module that needs JwtAuthGuard
 * or JwtService, so it is also not imported here directly.
 */
@Module({
  imports: [
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