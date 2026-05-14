/**
 * conversations.controller.ts
 * Base path: /conversations
 *
 * Used by the frontend for:
 *   GET  /conversations        — load conversation list on app start
 *   POST /conversations        — start a new chat (from NewChatScreen)
 *   PATCH /:id/read            — reset unread count
 *   PATCH /:id/mute            — toggle mute
 *   DELETE /:id                — delete conversation
 *
 * Auth: temporarily uses lender_004 via x-user-id header.
 * Replace @CurrentUser() extraction logic with real JWT when auth is ready.
 */
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
  targetUserId!: string;
}

class MuteDto {
  @IsBoolean()
  muted!: boolean;
}

@Controller('conversations')
export class ConversationsController {
  constructor(private conversations: ConversationsService) {}

  /** GET /conversations — list all conversations for logged-in user */
  @Get()
  list(@CurrentUser() userId: string) {
    return this.conversations.listForUser(userId);
  }

  /** POST /conversations — start or get existing conversation */
  @Post()
  start(@CurrentUser() userId: string, @Body() dto: StartConversationDto) {
    return this.conversations.getOrCreate(userId, dto.targetUserId);
  }

  /** GET /conversations/:id — get single conversation */
  @Get(':id')
  findOne(@Param('id') id: string, @CurrentUser() userId: string) {
    return this.conversations.findOne(id, userId);
  }

  /** PATCH /conversations/:id/read — reset unread count */
  @Patch(':id/read')
  markRead(@Param('id') id: string, @CurrentUser() userId: string) {
    return this.conversations.markAsRead(id, userId);
  }

  /** PATCH /conversations/:id/mute — toggle mute notifications */
  @Patch(':id/mute')
  mute(
    @Param('id') id: string,
    @CurrentUser() userId: string,
    @Body() dto: MuteDto,
  ) {
    return this.conversations.setMuted(id, userId, dto.muted);
  }

  /** DELETE /conversations/:id — delete conversation permanently */
  @Delete(':id')
  remove(@Param('id') id: string, @CurrentUser() userId: string) {
    return this.conversations.delete(id, userId);
  }
}