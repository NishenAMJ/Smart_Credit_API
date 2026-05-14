/**
 * chat.module.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Root module for the entire chat feature.
 *
 * LOCAL-FIRST NOTE:
 * MessagesModule (HTTP endpoints for fetching messages) is still included
 * so the app can do an initial sync on first install or after re-install.
 * After the first sync, the app reads from local SQLite — not the backend.
 *
 * FirebaseModule is @Global() so it does not need to be imported here —
 * it is imported once in AppModule and injected everywhere automatically.
 */
import { Module } from '@nestjs/common';
import { ConversationsModule } from './conversations/conversations.module';
import { MessagesModule } from './messages/messages.module';
import { UsersModule } from './users/users.module';
import { BlocksModule } from './users/blocks.module';
import { GatewayModule } from './gateway/gateway.module';

@Module({
  imports: [
    ConversationsModule, // REST: list/create/delete conversations
    MessagesModule,      // REST: initial message fetch for first install / re-install
    UsersModule,         // REST: user search, FCM token update, presence
    BlocksModule,        // REST: block/unblock users
    GatewayModule,       // WebSocket: real-time message routing
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