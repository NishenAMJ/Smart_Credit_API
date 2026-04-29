// Conversations controller handles all conversation-related HTTP requests


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
// Validates that targetUserId is a string
// Represents the user you want to start chatting with

class MuteDto {
  @IsBoolean()
  muted!: boolean;
}
// DTO for muting/unmuting a conversation
// Validates that muted is a boolean 

@Controller('conversations')
export class ConversationsController {
  constructor(private conversations: ConversationsService) {}
  // Controller with base route: /conversations

  // Get all conversations for the current user
  @Get()
  list(@CurrentUser() userId: string) {
    return this.conversations.listForUser(userId);
  }

  // Start a new conversation or get existing one with another user
  @Post()
  start(
    @CurrentUser() userId: string,
    @Body() dto: StartConversationDto,
  ) {
    return this.conversations.getOrCreate(userId, dto.targetUserId);
  }

  // Get a single conversation by ID
  // GET /conversations/:id
  @Get(':id')
  findOne(
    @Param('id') id: string,
    @CurrentUser() userId: string,
  ) {
    return this.conversations.findOne(id, userId);
  }

  // Mark conversation as read (clears unread message count)
  // PATCH /conversations/:id/read
  @Patch(':id/read')
  markRead(
    @Param('id') id: string,
    @CurrentUser() userId: string,
  ) {
    return this.conversations.markAsRead(id, userId);
  }

  // Mute or unmute notifications for a conversation
  // PATCH /conversations/:id/mute
  @Patch(':id/mute')
  mute(
    @Param('id') id: string,
    @CurrentUser() userId: string,
    @Body() dto: MuteDto,
  ) {
    return this.conversations.setMuted(id, userId, dto.muted);
  }

  // Delete a conversation entirely
  // DELETE /conversations/:id
  @Delete(':id')
  remove(
    @Param('id') id: string,
    @CurrentUser() userId: string,
  ) {
    return this.conversations.delete(id, userId);
  }
}