import {
  Controller,
  Get,
  Post,
  Delete,
  Patch,
  Param,
  Body,
} from '@nestjs/common';
import { IsString, IsBoolean } from 'class-validator';
import { ConversationsService } from './conversations.service';
import { CurrentUser } from '../common/decorators/current-user.decorator';

class StartConversationDto {
  @IsString()
  targetUserId: string;
}

class MuteDto {
  @IsBoolean()
  muted: boolean;
}

@Controller('conversations')
export class ConversationsController {
  constructor(private conversations: ConversationsService) {}

  // GET /conversations
  @Get()
  list(@CurrentUser() userId: string) {
    return this.conversations.listForUser(userId);
  }

  // POST /conversations  — get-or-create 1-on-1 conversation
  @Post()
  start(
    @CurrentUser() userId: string,
    @Body() dto: StartConversationDto,
  ) {
    return this.conversations.getOrCreate(userId, dto.targetUserId);
  }

  // GET /conversations/:id
  @Get(':id')
  findOne(
    @Param('id') id: string,
    @CurrentUser() userId: string,
  ) {
    return this.conversations.findOne(id, userId);
  }

  // PATCH /conversations/:id/read
  @Patch(':id/read')
  markRead(
    @Param('id') id: string,
    @CurrentUser() userId: string,
  ) {
    return this.conversations.markAsRead(id, userId);
  }

  // PATCH /conversations/:id/mute
  @Patch(':id/mute')
  mute(
    @Param('id') id: string,
    @CurrentUser() userId: string,
    @Body() dto: MuteDto,
  ) {
    return this.conversations.setMuted(id, userId, dto.muted);
  }

  // DELETE /conversations/:id
  @Delete(':id')
  remove(
    @Param('id') id: string,
    @CurrentUser() userId: string,
  ) {
    return this.conversations.delete(id, userId);
  }
}