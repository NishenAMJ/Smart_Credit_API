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

/**
 * DTOs — validated request bodies
 */
class StartConversationDto {
  @IsString()
  targetUserId!: string; // The user you want to chat with
}

class MuteDto {
  @IsBoolean()
  muted!: boolean; // true = mute, false = unmute
}

/**
 * ConversationsController
 * ──────────────────────────────────────────────────────────────
 * Base path: /conversations
 *
 * All routes require authentication — @CurrentUser() extracts the
 * userId set by your JWT guard on req.user.id.
 */
@Controller('conversations')
export class ConversationsController {
  constructor(private conversations: ConversationsService) {}

  /**
   * GET /conversations
   * Returns all conversations for the logged-in user, newest first.
   */
  @Get()
  list(@CurrentUser() userId: string) {
    return this.conversations.listForUser(userId);
  }

  /**
   * POST /conversations
   * Idempotent — starts a new conversation with targetUserId,
   * or returns the existing one if it already exists.
   * Body: { targetUserId: string }
   */
  @Post()
  start(
    @CurrentUser() userId: string,
    @Body() dto: StartConversationDto,
  ) {
    return this.conversations.getOrCreate(userId, dto.targetUserId);
  }

  /**
   * GET /conversations/:id
   * Returns a single conversation. Throws 403 if user is not a participant.
   */
  @Get(':id')
  findOne(
    @Param('id') id: string,
    @CurrentUser() userId: string,
  ) {
    return this.conversations.findOne(id, userId);
  }

  /**
   * PATCH /conversations/:id/read
   * Resets the caller's unread message count to 0.
   * Called when user opens the chat screen.
   */
  @Patch(':id/read')
  markRead(
    @Param('id') id: string,
    @CurrentUser() userId: string,
  ) {
    return this.conversations.markAsRead(id, userId);
  }

  /**
   * PATCH /conversations/:id/mute
   * Toggles push-notification muting for this conversation.
   * Body: { muted: boolean }
   */
  @Patch(':id/mute')
  mute(
    @Param('id') id: string,
    @CurrentUser() userId: string,
    @Body() dto: MuteDto,
  ) {
    return this.conversations.setMuted(id, userId, dto.muted);
  }

  /**
   * DELETE /conversations/:id
   * Permanently deletes the conversation and all its messages.
   * Only a participant can delete.
   */
  @Delete(':id')
  remove(
    @Param('id') id: string,
    @CurrentUser() userId: string,
  ) {
    return this.conversations.delete(id, userId);
  }
}