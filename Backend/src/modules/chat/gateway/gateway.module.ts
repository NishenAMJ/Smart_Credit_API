/**
 * gateway.module.ts
 * Registers ChatGateway and injects its service dependencies.
 */
import { Module } from '@nestjs/common';
import { ChatGateway } from './chat.gateway';
import { UsersModule } from '../users/users.module';
import { BlocksModule } from '../users/blocks.module';

@Module({
  imports: [
    UsersModule, // provides UsersService (online status, FCM token)
    BlocksModule, // provides BlocksService (block checks)
  ],
  providers: [ChatGateway],
  exports: [ChatGateway],
})
export class GatewayModule {}
