import { Module } from '@nestjs/common';
import { ConversationsController } from './conversations.controller';
import { ConversationsService } from './conversations.service';
import { UsersModule } from '../users/users.module';
import { AuthModule } from '../../auth/auth.module';

/**
 * AuthModule — provides JwtAuthGuard via PassportModule + JwtModule.
 * UsersModule — ConversationsService.mapParticipant() needs UsersService.
 */
@Module({
  imports: [AuthModule, UsersModule],
  controllers: [ConversationsController],
  providers: [ConversationsService],
  exports: [ConversationsService],
})
export class ConversationsModule {}