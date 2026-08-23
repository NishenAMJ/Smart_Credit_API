import { Module } from '@nestjs/common';
import { ChatGateway } from './chat.gateway';
import { UsersModule } from '../users/users.module';
import { BlocksModule } from '../users/blocks.module';
import { AuthModule } from '../../auth/auth.module';

/**
 * AuthModule is imported so JwtService is available for injection
 * into ChatGateway.handleConnection() to verify the token on WS connect.
 * AuthModule exports JwtModule which exports JwtService.
 */
@Module({
  imports: [
    AuthModule,
    UsersModule,
    BlocksModule,
  ],
  providers: [ChatGateway],
  exports: [ChatGateway],
})
export class GatewayModule {}